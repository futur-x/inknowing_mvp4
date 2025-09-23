"""
Permission Middleware and Decorators
权限验证中间件和装饰器
"""

from functools import wraps
from typing import List, Optional, Union
from fastapi import HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
import json
from datetime import datetime

from backend.core.database import get_db
from backend.core.config import settings
from backend.services.permission_service import PermissionService
from backend.models.admin_rbac import AdminUser
from backend.core.logger import logger


# HTTP Bearer 认证
security = HTTPBearer()


class PermissionChecker:
    """权限检查器"""

    def __init__(self, permissions: Union[str, List[str]] = None, require_all: bool = False):
        """
        初始化权限检查器
        :param permissions: 需要的权限，可以是单个权限或权限列表
        :param require_all: 是否需要所有权限，False表示有任一权限即可
        """
        if permissions is None:
            self.permissions = []
        elif isinstance(permissions, str):
            self.permissions = [permissions]
        else:
            self.permissions = permissions
        self.require_all = require_all

    async def __call__(
        self,
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ):
        """权限检查"""
        # 解析JWT Token
        try:
            payload = jwt.decode(
                credentials.credentials,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )
            admin_id = payload.get("admin_id")
            token_type = payload.get("type")

            if token_type != "admin_access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )

            if not admin_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        # 获取管理员信息
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin not found"
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account is disabled"
            )

        # 检查账户锁定
        if admin.locked_until and admin.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is locked until {admin.locked_until}"
            )

        # 设置请求上下文
        request.state.admin = admin
        request.state.admin_id = admin_id

        # 如果没有指定权限要求，只验证身份即可
        if not self.permissions:
            return admin

        # 检查权限
        permission_service = PermissionService(db)

        # 检查IP白名单
        client_ip = request.client.host
        if not permission_service.check_ip_whitelist(admin_id, client_ip):
            # 记录审计日志
            permission_service.create_audit_log(
                admin_id=admin_id,
                action="access_denied",
                module="auth",
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent"),
                status="failed",
                error_message="IP not in whitelist"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: IP not in whitelist"
            )

        # 检查权限
        if self.require_all:
            # 需要所有权限
            has_permission = permission_service.check_admin_all_permissions(
                admin_id, self.permissions
            )
        else:
            # 有任一权限即可
            has_permission = permission_service.check_admin_any_permission(
                admin_id, self.permissions
            )

        if not has_permission:
            # 记录审计日志
            permission_service.create_audit_log(
                admin_id=admin_id,
                action="permission_denied",
                module="auth",
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent"),
                status="failed",
                error_message=f"Missing permissions: {self.permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {', '.join(self.permissions)}"
            )

        return admin


# 便捷的权限装饰器
def require_permission(permissions: Union[str, List[str]] = None, require_all: bool = False):
    """
    权限装饰器
    :param permissions: 需要的权限
    :param require_all: 是否需要所有权限
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 这个装饰器主要用于标记权限要求
            # 实际的权限检查通过PermissionChecker依赖注入完成
            return await func(*args, **kwargs)

        # 在函数上添加权限元数据
        wrapper.__permission_required__ = permissions
        wrapper.__require_all__ = require_all
        return wrapper
    return decorator


# 预定义的权限检查器
class Permissions:
    """预定义的权限检查器"""

    # 用户管理
    UserView = PermissionChecker(["user.view"])
    UserCreate = PermissionChecker(["user.create"])
    UserEdit = PermissionChecker(["user.edit"])
    UserDelete = PermissionChecker(["user.delete"])
    UserExport = PermissionChecker(["user.export"])
    UserManage = PermissionChecker(["user.create", "user.edit", "user.delete"])

    # 书籍管理
    BookView = PermissionChecker(["book.view"])
    BookCreate = PermissionChecker(["book.create"])
    BookEdit = PermissionChecker(["book.edit"])
    BookDelete = PermissionChecker(["book.delete"])
    BookApprove = PermissionChecker(["book.approve"])
    BookManage = PermissionChecker(["book.create", "book.edit", "book.delete"])

    # 对话管理
    DialogueView = PermissionChecker(["dialogue.view"])
    DialogueExport = PermissionChecker(["dialogue.export"])
    DialogueDelete = PermissionChecker(["dialogue.delete"])

    # 统计
    StatsView = PermissionChecker(["stats.view"])
    StatsExport = PermissionChecker(["stats.export"])

    # 管理员管理
    AdminView = PermissionChecker(["admin.view"])
    AdminCreate = PermissionChecker(["admin.create"])
    AdminEdit = PermissionChecker(["admin.edit"])
    AdminDelete = PermissionChecker(["admin.delete"])
    AdminRole = PermissionChecker(["admin.role"])
    AdminManage = PermissionChecker(["admin.create", "admin.edit", "admin.delete", "admin.role"])

    # 系统管理
    SystemConfig = PermissionChecker(["system.config"])
    SystemAudit = PermissionChecker(["system.audit"])
    SystemBackup = PermissionChecker(["system.backup"])
    SystemMonitor = PermissionChecker(["system.monitor"])
    SystemAdmin = PermissionChecker(
        ["system.config", "system.audit", "system.backup", "system.monitor"],
        require_all=True
    )

    # 超级管理员
    SuperAdmin = PermissionChecker()  # 只验证身份，不检查具体权限


class PermissionMiddleware:
    """权限中间件"""

    def __init__(self):
        pass

    async def __call__(self, request: Request, call_next):
        """中间件处理"""
        # 获取请求路径
        path = request.url.path

        # 跳过不需要权限的路径
        if self._should_skip_auth(path):
            response = await call_next(request)
            return response

        # 对于需要权限的路径，验证会通过依赖注入完成
        # 这里可以添加额外的处理逻辑

        # 记录访问日志
        start_time = datetime.utcnow()
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds()

        # 添加响应头
        response.headers["X-Process-Time"] = str(process_time)

        # 如果有admin信息，记录访问日志
        if hasattr(request.state, "admin_id"):
            logger.info(
                f"Admin {request.state.admin_id} accessed {path} "
                f"[{request.method}] in {process_time:.3f}s"
            )

        return response

    def _should_skip_auth(self, path: str) -> bool:
        """判断是否跳过认证"""
        # 定义不需要认证的路径
        skip_paths = [
            "/api/v1/admin/auth/login",
            "/api/v1/admin/auth/refresh",
            "/api/v1/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico"
        ]

        for skip_path in skip_paths:
            if path.startswith(skip_path):
                return True

        return False


def audit_log(action: str, module: str):
    """
    审计日志装饰器
    :param action: 操作类型
    :param module: 模块名称
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = None
            db = None

            # 从参数中获取request和db
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif isinstance(arg, Session):
                    db = arg

            # 从kwargs中获取
            if not request:
                request = kwargs.get("request")
            if not db:
                db = kwargs.get("db")

            # 记录操作前的状态
            start_time = datetime.utcnow()
            error_msg = None
            status = "success"

            try:
                # 执行原函数
                result = await func(*args, **kwargs)
                return result

            except Exception as e:
                error_msg = str(e)
                status = "failed"
                raise

            finally:
                # 记录审计日志
                if request and db and hasattr(request.state, "admin_id"):
                    try:
                        permission_service = PermissionService(db)
                        permission_service.create_audit_log(
                            admin_id=request.state.admin_id,
                            action=action,
                            module=module,
                            ip_address=request.client.host,
                            user_agent=request.headers.get("User-Agent"),
                            status=status,
                            error_message=error_msg,
                            request_id=request.headers.get("X-Request-ID")
                        )
                    except Exception as e:
                        logger.error(f"Failed to create audit log: {e}")

        return wrapper
    return decorator