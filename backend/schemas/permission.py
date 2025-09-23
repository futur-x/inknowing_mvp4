"""
Permission System Schemas
权限系统数据模式
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, UUID4
from enum import Enum


# ==================== 角色相关 ====================

class RoleBase(BaseModel):
    """角色基础模式"""
    name: str = Field(..., min_length=1, max_length=50, description="角色名称")
    display_name: str = Field(..., min_length=1, max_length=100, description="显示名称")
    description: Optional[str] = Field(None, description="角色描述")
    parent_role_id: Optional[UUID4] = Field(None, description="父角色ID")


class RoleCreate(RoleBase):
    """创建角色模式"""
    pass


class RoleUpdate(BaseModel):
    """更新角色模式"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_role_id: Optional[UUID4] = None
    is_active: Optional[bool] = None


class RoleResponse(RoleBase):
    """角色响应模式"""
    id: UUID4
    is_system: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID4]

    class Config:
        orm_mode = True


class RoleWithPermissions(RoleResponse):
    """带权限的角色响应"""
    permissions: List["PermissionResponse"] = []


# ==================== 权限相关 ====================

class PermissionBase(BaseModel):
    """权限基础模式"""
    code: str = Field(..., min_length=1, max_length=100, description="权限代码")
    module: str = Field(..., min_length=1, max_length=50, description="模块名称")
    action: str = Field(..., min_length=1, max_length=50, description="操作类型")
    resource: Optional[str] = Field(None, max_length=100, description="资源标识")
    description: Optional[str] = Field(None, description="权限描述")


class PermissionCreate(PermissionBase):
    """创建权限模式"""
    pass


class PermissionResponse(PermissionBase):
    """权限响应模式"""
    id: UUID4
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ==================== 角色权限关联 ====================

class AssignPermissionsRequest(BaseModel):
    """分配权限请求"""
    permission_ids: List[UUID4] = Field(..., description="权限ID列表")


class RolePermissionResponse(BaseModel):
    """角色权限响应"""
    role: RoleResponse
    permissions: List[PermissionResponse]


# ==================== 管理员相关 ====================

class AdminUserBase(BaseModel):
    """管理员基础模式"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    phone: Optional[str] = Field(None, description="手机号")
    real_name: Optional[str] = Field(None, description="真实姓名")


class AdminUserCreate(AdminUserBase):
    """创建管理员模式"""
    password: str = Field(..., min_length=6, description="密码")
    role_id: UUID4 = Field(..., description="角色ID")


class AdminUserUpdate(BaseModel):
    """更新管理员模式"""
    email: Optional[str] = None
    phone: Optional[str] = None
    real_name: Optional[str] = None
    avatar: Optional[str] = None
    role_id: Optional[UUID4] = None
    is_active: Optional[bool] = None


class AdminUserResponse(AdminUserBase):
    """管理员响应模式"""
    id: UUID4
    avatar: Optional[str]
    role_id: Optional[UUID4]
    role_name: Optional[str] = None
    is_active: bool
    two_factor_enabled: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class AdminUserWithPermissions(AdminUserResponse):
    """带权限的管理员响应"""
    permissions: List[str] = []


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., min_length=6, description="新密码")


class AssignRoleRequest(BaseModel):
    """分配角色请求"""
    role_id: UUID4 = Field(..., description="角色ID")


class ExtraPermissionsRequest(BaseModel):
    """额外权限请求"""
    extra_permissions: List[str] = Field(default_factory=list, description="额外权限列表")
    denied_permissions: List[str] = Field(default_factory=list, description="禁用权限列表")


# ==================== 审计日志相关 ====================

class AuditLogFilter(BaseModel):
    """审计日志过滤器"""
    admin_id: Optional[UUID4] = None
    module: Optional[str] = None
    action: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None


class AuditLogResponse(BaseModel):
    """审计日志响应"""
    id: UUID4
    admin_id: UUID4
    admin_username: Optional[str] = None
    action: str
    module: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    old_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


# ==================== IP白名单相关 ====================

class IPWhitelistCreate(BaseModel):
    """创建IP白名单"""
    ip_address: str = Field(..., description="IP地址")
    description: Optional[str] = Field(None, description="描述")
    expires_at: Optional[datetime] = Field(None, description="过期时间")


class IPWhitelistResponse(BaseModel):
    """IP白名单响应"""
    id: UUID4
    admin_id: UUID4
    ip_address: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        orm_mode = True


# ==================== 会话管理相关 ====================

class AdminSessionResponse(BaseModel):
    """管理员会话响应"""
    id: UUID4
    admin_id: UUID4
    ip_address: Optional[str]
    user_agent: Optional[str]
    last_activity: datetime
    expires_at: datetime
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ==================== 权限策略相关 ====================

class PolicyType(str, Enum):
    """策略类型"""
    ALL = "all"  # 所有数据
    OWN = "own"  # 仅自己的数据
    DEPARTMENT = "department"  # 部门数据
    CUSTOM = "custom"  # 自定义条件


class PermissionPolicyCreate(BaseModel):
    """创建权限策略"""
    role_id: UUID4 = Field(..., description="角色ID")
    resource_type: str = Field(..., description="资源类型")
    policy_type: PolicyType = Field(..., description="策略类型")
    conditions: Optional[Dict[str, Any]] = Field(None, description="自定义条件")


class PermissionPolicyResponse(BaseModel):
    """权限策略响应"""
    id: UUID4
    role_id: UUID4
    resource_type: str
    policy_type: PolicyType
    conditions: Optional[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ==================== 通用响应 ====================

class PermissionCheckResponse(BaseModel):
    """权限检查响应"""
    has_permission: bool
    permissions: List[str]
    denied_permissions: List[str]


class BatchOperationResponse(BaseModel):
    """批量操作响应"""
    success_count: int
    failed_count: int
    failed_items: List[Dict[str, Any]] = []