"""
Permission Service
权限管理服务层
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
import hashlib
import json

from backend.models.permission import (
    Role, Permission, RolePermission,
    PermissionAuditLog, PermissionPolicy, IPWhitelist, AdminSession
)
from backend.models.admin_rbac import AdminUser
from backend.core.cache import redis_client
from backend.core.logger import logger


class PermissionService:
    """权限管理服务"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== 角色管理 ====================

    def get_roles(self, is_active: Optional[bool] = None) -> List[Role]:
        """获取角色列表"""
        query = self.db.query(Role)
        if is_active is not None:
            query = query.filter(Role.is_active == is_active)
        return query.order_by(Role.created_at).all()

    def get_role(self, role_id: UUID) -> Optional[Role]:
        """获取单个角色"""
        return self.db.query(Role).filter(Role.id == role_id).first()

    def get_role_by_name(self, name: str) -> Optional[Role]:
        """根据名称获取角色"""
        return self.db.query(Role).filter(Role.name == name).first()

    def create_role(
        self,
        name: str,
        display_name: str,
        description: str = None,
        parent_role_id: UUID = None,
        created_by: UUID = None
    ) -> Role:
        """创建角色"""
        # 检查名称是否重复
        if self.get_role_by_name(name):
            raise ValueError(f"Role with name '{name}' already exists")

        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            parent_role_id=parent_role_id,
            created_by=created_by
        )
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)

        # 清除缓存
        self._clear_permission_cache()

        return role

    def update_role(
        self,
        role_id: UUID,
        display_name: str = None,
        description: str = None,
        parent_role_id: UUID = None,
        is_active: bool = None
    ) -> Optional[Role]:
        """更新角色"""
        role = self.get_role(role_id)
        if not role:
            return None

        if role.is_system:
            raise ValueError("System roles cannot be modified")

        if display_name is not None:
            role.display_name = display_name
        if description is not None:
            role.description = description
        if parent_role_id is not None:
            # 检查是否会形成循环继承
            if self._check_role_circular_inheritance(role_id, parent_role_id):
                raise ValueError("Circular inheritance detected")
            role.parent_role_id = parent_role_id
        if is_active is not None:
            role.is_active = is_active

        self.db.commit()
        self.db.refresh(role)

        # 清除缓存
        self._clear_permission_cache()

        return role

    def delete_role(self, role_id: UUID) -> bool:
        """删除角色"""
        role = self.get_role(role_id)
        if not role:
            return False

        if role.is_system:
            raise ValueError("System roles cannot be deleted")

        # 检查是否有用户使用此角色
        user_count = self.db.query(AdminUser).filter(AdminUser.role_id == role_id).count()
        if user_count > 0:
            raise ValueError(f"Cannot delete role: {user_count} users are using this role")

        self.db.delete(role)
        self.db.commit()

        # 清除缓存
        self._clear_permission_cache()

        return True

    def _check_role_circular_inheritance(self, role_id: UUID, parent_id: UUID) -> bool:
        """检查角色继承是否会形成循环"""
        if str(role_id) == str(parent_id):
            return True

        visited = set()
        current = parent_id

        while current:
            if str(current) in visited:
                return True
            if str(current) == str(role_id):
                return True

            visited.add(str(current))
            parent_role = self.get_role(current)
            current = parent_role.parent_role_id if parent_role else None

        return False

    # ==================== 权限管理 ====================

    def get_permissions(self, module: str = None, is_active: bool = None) -> List[Permission]:
        """获取权限列表"""
        query = self.db.query(Permission)
        if module:
            query = query.filter(Permission.module == module)
        if is_active is not None:
            query = query.filter(Permission.is_active == is_active)
        return query.order_by(Permission.module, Permission.action).all()

    def get_permission(self, permission_id: UUID) -> Optional[Permission]:
        """获取单个权限"""
        return self.db.query(Permission).filter(Permission.id == permission_id).first()

    def get_permission_by_code(self, code: str) -> Optional[Permission]:
        """根据代码获取权限"""
        return self.db.query(Permission).filter(Permission.code == code).first()

    def create_permission(
        self,
        code: str,
        module: str,
        action: str,
        description: str = None,
        resource: str = None
    ) -> Permission:
        """创建权限"""
        # 检查代码是否重复
        if self.get_permission_by_code(code):
            raise ValueError(f"Permission with code '{code}' already exists")

        permission = Permission(
            code=code,
            module=module,
            action=action,
            description=description,
            resource=resource
        )
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)

        return permission

    # ==================== 角色权限关联 ====================

    def get_role_permissions(self, role_id: UUID) -> List[Permission]:
        """获取角色的权限"""
        role = self.get_role(role_id)
        if not role:
            return []

        permissions = []
        # 获取直接权限
        for rp in role.permissions:
            if rp.permission.is_active:
                permissions.append(rp.permission)

        # 获取继承的权限
        parent = role.parent_role
        while parent:
            for rp in parent.permissions:
                if rp.permission.is_active and rp.permission not in permissions:
                    permissions.append(rp.permission)
            parent = parent.parent_role

        return permissions

    def assign_permissions_to_role(
        self,
        role_id: UUID,
        permission_ids: List[UUID],
        created_by: UUID = None
    ) -> bool:
        """为角色分配权限"""
        role = self.get_role(role_id)
        if not role:
            raise ValueError("Role not found")

        # 删除现有权限
        self.db.query(RolePermission).filter(
            RolePermission.role_id == role_id
        ).delete()

        # 添加新权限
        for permission_id in permission_ids:
            permission = self.get_permission(permission_id)
            if permission:
                rp = RolePermission(
                    role_id=role_id,
                    permission_id=permission_id,
                    created_by=created_by
                )
                self.db.add(rp)

        self.db.commit()

        # 清除缓存
        self._clear_permission_cache()

        return True

    def add_permission_to_role(
        self,
        role_id: UUID,
        permission_id: UUID,
        created_by: UUID = None
    ) -> bool:
        """为角色添加单个权限"""
        # 检查是否已存在
        existing = self.db.query(RolePermission).filter(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id
            )
        ).first()

        if existing:
            return True

        rp = RolePermission(
            role_id=role_id,
            permission_id=permission_id,
            created_by=created_by
        )
        self.db.add(rp)
        self.db.commit()

        # 清除缓存
        self._clear_permission_cache()

        return True

    def remove_permission_from_role(self, role_id: UUID, permission_id: UUID) -> bool:
        """从角色移除权限"""
        result = self.db.query(RolePermission).filter(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id
            )
        ).delete()

        self.db.commit()

        # 清除缓存
        self._clear_permission_cache()

        return result > 0

    # ==================== 管理员权限管理 ====================

    def get_admin_permissions(self, admin_id: UUID) -> List[str]:
        """获取管理员的所有权限"""
        # 先从缓存获取
        cache_key = f"admin:permissions:{admin_id}"
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

        admin = self.db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            return []

        permissions = admin.get_all_permissions()

        # 缓存权限（5分钟）
        redis_client.setex(cache_key, 300, json.dumps(permissions))

        return permissions

    def check_admin_permission(self, admin_id: UUID, permission_code: str) -> bool:
        """检查管理员是否有指定权限"""
        permissions = self.get_admin_permissions(admin_id)
        return permission_code in permissions

    def check_admin_any_permission(self, admin_id: UUID, permission_codes: List[str]) -> bool:
        """检查管理员是否有任一权限"""
        permissions = self.get_admin_permissions(admin_id)
        return any(code in permissions for code in permission_codes)

    def check_admin_all_permissions(self, admin_id: UUID, permission_codes: List[str]) -> bool:
        """检查管理员是否有所有权限"""
        permissions = self.get_admin_permissions(admin_id)
        return all(code in permissions for code in permission_codes)

    # ==================== 审计日志 ====================

    def create_audit_log(
        self,
        admin_id: UUID,
        action: str,
        module: str,
        resource_type: str = None,
        resource_id: str = None,
        old_value: Dict = None,
        new_value: Dict = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
        status: str = "success",
        error_message: str = None
    ) -> PermissionAuditLog:
        """创建审计日志"""
        audit_log = PermissionAuditLog(
            admin_id=admin_id,
            action=action,
            module=module,
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            status=status,
            error_message=error_message
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)

        return audit_log

    def get_audit_logs(
        self,
        admin_id: UUID = None,
        module: str = None,
        action: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """获取审计日志"""
        query = self.db.query(AuditLog)

        if admin_id:
            query = query.filter(AuditLog.admin_id == admin_id)
        if module:
            query = query.filter(AuditLog.module == module)
        if action:
            query = query.filter(AuditLog.action == action)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        return query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    # ==================== IP白名单管理 ====================

    def check_ip_whitelist(self, admin_id: UUID, ip_address: str) -> bool:
        """检查IP是否在白名单中"""
        # 获取管理员的白名单
        whitelist = self.db.query(IPWhitelist).filter(
            and_(
                IPWhitelist.admin_id == admin_id,
                IPWhitelist.is_active == True,
                or_(
                    IPWhitelist.expires_at.is_(None),
                    IPWhitelist.expires_at > datetime.utcnow()
                )
            )
        ).all()

        if not whitelist:
            return True  # 如果没有配置白名单，则允许所有IP

        for entry in whitelist:
            if entry.ip_address == ip_address:
                return True

            # TODO: 实现IP范围检查
            # if entry.ip_range_start and entry.ip_range_end:
            #     if check_ip_in_range(ip_address, entry.ip_range_start, entry.ip_range_end):
            #         return True

        return False

    def add_ip_whitelist(
        self,
        admin_id: UUID,
        ip_address: str,
        description: str = None,
        expires_at: datetime = None
    ) -> IPWhitelist:
        """添加IP白名单"""
        whitelist = IPWhitelist(
            admin_id=admin_id,
            ip_address=ip_address,
            description=description,
            expires_at=expires_at
        )
        self.db.add(whitelist)
        self.db.commit()
        self.db.refresh(whitelist)

        return whitelist

    # ==================== 会话管理 ====================

    def create_admin_session(
        self,
        admin_id: UUID,
        token_hash: str,
        ip_address: str = None,
        user_agent: str = None,
        expires_in_hours: int = 24
    ) -> AdminSession:
        """创建管理员会话"""
        session = AdminSession(
            admin_id=admin_id,
            token_hash=token_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def validate_admin_session(self, token_hash: str) -> Optional[AdminSession]:
        """验证管理员会话"""
        session = self.db.query(AdminSession).filter(
            and_(
                AdminSession.token_hash == token_hash,
                AdminSession.is_active == True,
                AdminSession.expires_at > datetime.utcnow()
            )
        ).first()

        if session:
            # 更新最后活动时间
            session.last_activity = datetime.utcnow()
            self.db.commit()

        return session

    def revoke_admin_session(self, session_id: UUID) -> bool:
        """撤销会话"""
        session = self.db.query(AdminSession).filter(AdminSession.id == session_id).first()
        if session:
            session.is_active = False
            self.db.commit()
            return True
        return False

    def cleanup_expired_sessions(self) -> int:
        """清理过期会话"""
        result = self.db.query(AdminSession).filter(
            AdminSession.expires_at < datetime.utcnow()
        ).delete()
        self.db.commit()
        return result

    # ==================== 缓存管理 ====================

    def _clear_permission_cache(self):
        """清除权限缓存"""
        # 清除所有管理员的权限缓存
        pattern = "admin:permissions:*"
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)

    def _hash_token(self, token: str) -> str:
        """哈希令牌"""
        return hashlib.sha256(token.encode()).hexdigest()