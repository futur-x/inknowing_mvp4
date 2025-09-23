"""
Enhanced Admin User model with RBAC support
扩展的管理员用户模型，支持RBAC权限系统
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from db.database import Base


class AdminUser(Base):
    """增强的管理员用户模型"""
    __tablename__ = "admin_users"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # 基础信息
    email = Column(String(255), unique=True)
    phone = Column(String(20))
    real_name = Column(String(100))
    avatar = Column(Text)

    # RBAC角色
    role_id = Column(UUID(as_uuid=True), ForeignKey("auth.roles.id"))

    # 旧的角色字段（保持兼容）
    role_old = Column("role", String(20), default="moderator")

    # 权限相关
    permissions = Column(JSONB, default=list)  # 旧的权限字段（保持兼容）
    extra_permissions = Column(JSONB, default=list)  # 额外权限
    denied_permissions = Column(JSONB, default=list)  # 禁用权限

    # 安全相关
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    login_ip = Column(String(45))
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    password_changed_at = Column(DateTime)

    # 状态
    is_active = Column(Boolean, default=True)

    # 审计
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id"))

    # Relationships
    role = relationship("Role", back_populates="admin_users")
    audit_logs = relationship("AuditLog", back_populates="admin", cascade="all, delete-orphan")
    ip_whitelist = relationship("IPWhitelist", back_populates="admin", cascade="all, delete-orphan")
    sessions = relationship("AdminSession", back_populates="admin", cascade="all, delete-orphan")

    def get_all_permissions(self):
        """获取用户的所有权限"""
        permissions = set()

        # 从角色获取权限
        if self.role:
            for rp in self.role.permissions:
                if rp.permission.is_active:
                    permissions.add(rp.permission.code)

            # 处理角色继承
            parent = self.role.parent_role
            while parent:
                for rp in parent.permissions:
                    if rp.permission.is_active:
                        permissions.add(rp.permission.code)
                parent = parent.parent_role

        # 添加额外权限
        if self.extra_permissions:
            permissions.update(self.extra_permissions)

        # 移除禁用权限
        if self.denied_permissions:
            permissions = permissions - set(self.denied_permissions)

        return list(permissions)

    def has_permission(self, permission_code):
        """检查是否有指定权限"""
        # 超级管理员拥有所有权限
        if self.role and self.role.name == 'super_admin':
            return True

        return permission_code in self.get_all_permissions()

    def has_any_permission(self, permission_codes):
        """检查是否有任一权限"""
        if self.role and self.role.name == 'super_admin':
            return True

        all_permissions = self.get_all_permissions()
        return any(code in all_permissions for code in permission_codes)

    def has_all_permissions(self, permission_codes):
        """检查是否有所有权限"""
        if self.role and self.role.name == 'super_admin':
            return True

        all_permissions = self.get_all_permissions()
        return all(code in all_permissions for code in permission_codes)