"""
Permission Management API
权限管理API接口
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from backend.core.database import get_db
from backend.core.permission_middleware import PermissionChecker, Permissions, audit_log
from backend.models.admin_rbac import AdminUser
from backend.services.permission_service import PermissionService
from backend.schemas.permission import (
    PermissionCreate, PermissionResponse, PermissionCheckResponse
)
from backend.core.logger import logger

router = APIRouter(prefix="/permissions", tags=["Permission Management"])


@router.get("/", response_model=List[PermissionResponse])
async def list_permissions(
    module: Optional[str] = Query(None, description="按模块过滤"),
    is_active: Optional[bool] = Query(None, description="过滤激活状态"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取权限列表

    权限要求：admin.role
    """
    service = PermissionService(db)
    permissions = service.get_permissions(module=module, is_active=is_active)
    return permissions


@router.get("/modules", response_model=List[str])
async def get_permission_modules(
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取所有权限模块

    权限要求：admin.role
    """
    service = PermissionService(db)
    permissions = service.get_permissions()

    # 提取唯一的模块列表
    modules = list(set([p.module for p in permissions]))
    modules.sort()

    return modules


@router.get("/{permission_id}", response_model=PermissionResponse)
async def get_permission(
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取单个权限详情

    权限要求：admin.role
    """
    service = PermissionService(db)
    permission = service.get_permission(permission_id)

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )

    return permission


@router.post("/", response_model=PermissionResponse)
@audit_log("create_permission", "permission")
async def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.SuperAdmin)
):
    """
    创建新权限

    权限要求：超级管理员
    """
    service = PermissionService(db)

    try:
        permission = service.create_permission(
            code=permission_data.code,
            module=permission_data.module,
            action=permission_data.action,
            description=permission_data.description,
            resource=permission_data.resource
        )

        logger.info(f"Admin {current_admin.username} created permission {permission.code}")
        return permission

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create permission"
        )


@router.get("/check/current", response_model=PermissionCheckResponse)
async def check_current_permissions(
    permissions: List[str] = Query(..., description="要检查的权限列表"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(PermissionChecker())
):
    """
    检查当前用户的权限

    权限要求：需要登录
    """
    service = PermissionService(db)

    # 获取用户所有权限
    all_permissions = service.get_admin_permissions(current_admin.id)

    # 检查指定权限
    has_permissions = [p for p in permissions if p in all_permissions]
    missing_permissions = [p for p in permissions if p not in all_permissions]

    # 获取禁用权限
    denied = current_admin.denied_permissions if current_admin.denied_permissions else []

    return {
        "has_permission": len(missing_permissions) == 0,
        "permissions": has_permissions,
        "denied_permissions": denied
    }


@router.get("/admin/{admin_id}", response_model=List[str])
async def get_admin_permissions(
    admin_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminView)
):
    """
    获取指定管理员的所有权限

    权限要求：admin.view
    """
    service = PermissionService(db)

    # 检查管理员是否存在
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    permissions = service.get_admin_permissions(admin_id)
    return permissions


@router.post("/admin/{admin_id}/check", response_model=PermissionCheckResponse)
async def check_admin_permission(
    admin_id: UUID,
    permissions: List[str] = Query(..., description="要检查的权限列表"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminView)
):
    """
    检查指定管理员的权限

    权限要求：admin.view
    """
    service = PermissionService(db)

    # 检查管理员是否存在
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    # 获取管理员所有权限
    all_permissions = service.get_admin_permissions(admin_id)

    # 检查指定权限
    has_permissions = [p for p in permissions if p in all_permissions]
    missing_permissions = [p for p in permissions if p not in all_permissions]

    # 获取禁用权限
    denied = admin.denied_permissions if admin.denied_permissions else []

    return {
        "has_permission": len(missing_permissions) == 0,
        "permissions": has_permissions,
        "denied_permissions": denied
    }


@router.get("/tree/structure")
async def get_permission_tree(
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取权限树结构

    权限要求：admin.role
    """
    service = PermissionService(db)
    permissions = service.get_permissions(is_active=True)

    # 构建权限树
    tree = {}
    for permission in permissions:
        if permission.module not in tree:
            tree[permission.module] = {
                "module": permission.module,
                "permissions": []
            }

        tree[permission.module]["permissions"].append({
            "id": str(permission.id),
            "code": permission.code,
            "action": permission.action,
            "description": permission.description,
            "resource": permission.resource
        })

    # 转换为列表格式
    result = list(tree.values())

    return result