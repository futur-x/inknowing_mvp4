"""
Role Management API
角色管理API接口
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
    RoleCreate, RoleUpdate, RoleResponse, RoleWithPermissions,
    AssignPermissionsRequest, RolePermissionResponse
)
from backend.core.logger import logger

router = APIRouter(prefix="/roles", tags=["Role Management"])


@router.get("/", response_model=List[RoleResponse])
@audit_log("list_roles", "role")
async def list_roles(
    is_active: Optional[bool] = Query(None, description="过滤激活状态"),
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取角色列表

    权限要求：admin.role
    """
    service = PermissionService(db)
    roles = service.get_roles(is_active)
    return roles


@router.get("/{role_id}", response_model=RoleWithPermissions)
@audit_log("view_role", "role")
async def get_role(
    role_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取单个角色详情

    权限要求：admin.role
    """
    service = PermissionService(db)
    role = service.get_role(role_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # 获取角色权限
    permissions = service.get_role_permissions(role_id)

    return {
        **role.__dict__,
        "permissions": permissions
    }


@router.post("/", response_model=RoleResponse)
@audit_log("create_role", "role")
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    创建新角色

    权限要求：admin.role
    """
    service = PermissionService(db)

    try:
        role = service.create_role(
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            parent_role_id=role_data.parent_role_id,
            created_by=current_admin.id
        )

        logger.info(f"Admin {current_admin.username} created role {role.name}")
        return role

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create role"
        )


@router.put("/{role_id}", response_model=RoleResponse)
@audit_log("update_role", "role")
async def update_role(
    role_id: UUID,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    更新角色信息

    权限要求：admin.role
    """
    service = PermissionService(db)

    try:
        role = service.update_role(
            role_id=role_id,
            display_name=role_data.display_name,
            description=role_data.description,
            parent_role_id=role_data.parent_role_id,
            is_active=role_data.is_active
        )

        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )

        logger.info(f"Admin {current_admin.username} updated role {role_id}")
        return role

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role"
        )


@router.delete("/{role_id}")
@audit_log("delete_role", "role")
async def delete_role(
    role_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    删除角色

    权限要求：admin.role
    注意：系统角色无法删除，有用户使用的角色无法删除
    """
    service = PermissionService(db)

    try:
        success = service.delete_role(role_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )

        logger.info(f"Admin {current_admin.username} deleted role {role_id}")
        return {"message": "Role deleted successfully"}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role"
        )


@router.get("/{role_id}/permissions", response_model=List["PermissionResponse"])
@audit_log("view_role_permissions", "role")
async def get_role_permissions(
    role_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    获取角色的权限列表

    权限要求：admin.role
    """
    service = PermissionService(db)

    role = service.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    permissions = service.get_role_permissions(role_id)
    return permissions


@router.post("/{role_id}/permissions", response_model=RolePermissionResponse)
@audit_log("assign_permissions", "role")
async def assign_permissions_to_role(
    role_id: UUID,
    request: AssignPermissionsRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    为角色分配权限

    权限要求：admin.role
    """
    service = PermissionService(db)

    try:
        success = service.assign_permissions_to_role(
            role_id=role_id,
            permission_ids=request.permission_ids,
            created_by=current_admin.id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to assign permissions"
            )

        # 返回更新后的角色权限
        role = service.get_role(role_id)
        permissions = service.get_role_permissions(role_id)

        logger.info(f"Admin {current_admin.username} assigned permissions to role {role_id}")

        return {
            "role": role,
            "permissions": permissions
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to assign permissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign permissions"
        )


@router.post("/{role_id}/permissions/{permission_id}")
@audit_log("add_permission_to_role", "role")
async def add_permission_to_role(
    role_id: UUID,
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    为角色添加单个权限

    权限要求：admin.role
    """
    service = PermissionService(db)

    success = service.add_permission_to_role(
        role_id=role_id,
        permission_id=permission_id,
        created_by=current_admin.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add permission"
        )

    logger.info(f"Admin {current_admin.username} added permission {permission_id} to role {role_id}")
    return {"message": "Permission added successfully"}


@router.delete("/{role_id}/permissions/{permission_id}")
@audit_log("remove_permission_from_role", "role")
async def remove_permission_from_role(
    role_id: UUID,
    permission_id: UUID,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(Permissions.AdminRole)
):
    """
    从角色移除权限

    权限要求：admin.role
    """
    service = PermissionService(db)

    success = service.remove_permission_from_role(role_id, permission_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found in role"
        )

    logger.info(f"Admin {current_admin.username} removed permission {permission_id} from role {role_id}")
    return {"message": "Permission removed successfully"}