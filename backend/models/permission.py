"""
RBAC Permission System Models
权限系统数据模型
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, JSON, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from db.database import Base


class Role(Base):
    """角色模型"""
    __tablename__ = "roles"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_role_id = Column(UUID(as_uuid=True), ForeignKey("auth.roles.id", ondelete="SET NULL"))
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id"))

    # Relationships
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    admin_users = relationship("AdminUser", back_populates="role")
    parent_role = relationship("Role", remote_side=[id])
    permission_policies = relationship("PermissionPolicy", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    """权限模型"""
    __tablename__ = "permissions"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False)
    module = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    resource = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    """角色权限关联模型"""
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey("auth.roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(UUID(as_uuid=True), ForeignKey("auth.permissions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    created_by = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id"))

    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class PermissionAuditLog(Base):
    """权限审计日志模型"""
    __tablename__ = "permission_audit_logs"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id"))
    action = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(255))
    old_value = Column(JSONB)
    new_value = Column(JSONB)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_id = Column(String(100))
    status = Column(String(20), default="success")
    error_message = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    admin = relationship("AdminUser", back_populates="audit_logs")


class PermissionPolicy(Base):
    """权限策略模型（数据级权限）"""
    __tablename__ = "permission_policies"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey("auth.roles.id", ondelete="CASCADE"))
    resource_type = Column(String(50), nullable=False)
    policy_type = Column(String(20), nullable=False)  # all, own, department, custom
    conditions = Column(JSONB)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships
    role = relationship("Role", back_populates="permission_policies")


class IPWhitelist(Base):
    """IP白名单模型"""
    __tablename__ = "ip_whitelist"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id", ondelete="CASCADE"))
    ip_address = Column(String(45), nullable=False)
    ip_range_start = Column(INET)
    ip_range_end = Column(INET)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    expires_at = Column(TIMESTAMP)

    # Relationships
    admin = relationship("AdminUser", back_populates="ip_whitelist")


class AdminSession(Base):
    """管理员会话模型"""
    __tablename__ = "admin_sessions"
    __table_args__ = {"schema": "auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("auth.admin_users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    last_activity = Column(TIMESTAMP, server_default=func.current_timestamp())
    expires_at = Column(TIMESTAMP, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Relationships
    admin = relationship("AdminUser", back_populates="sessions")