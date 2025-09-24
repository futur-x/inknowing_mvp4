"""
Admin related models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlmodel import Field, SQLModel, Relationship, Column, JSON
from sqlalchemy.sql import func
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID as PGUUID


class AdminRole(str, Enum):
    """Admin role types"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"

    @classmethod
    def _missing_(cls, value):
        """Handle case-insensitive enum lookup"""
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        return None


class AdminStatus(str, Enum):
    """Admin account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

    @classmethod
    def _missing_(cls, value):
        """Handle case-insensitive enum lookup"""
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        return None


class AuditActionType(str, Enum):
    """Audit log action types"""
    # Auth actions
    LOGIN = "login"
    LOGOUT = "logout"
    FAILED_LOGIN = "failed_login"

    # User management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_SUSPEND = "user_suspend"
    USER_UNSUSPEND = "user_unsuspend"
    USER_MEMBERSHIP_CHANGE = "user_membership_change"
    USER_STATUS_CHANGE = "user_status_change"
    PASSWORD_RESET = "password_reset"
    POINTS_ADJUSTMENT = "points_adjustment"
    DATA_EXPORT = "data_export"

    # Book management
    BOOK_CREATE = "book_create"
    BOOK_UPDATE = "book_update"
    BOOK_DELETE = "book_delete"
    BOOK_APPROVE = "book_approve"
    BOOK_REJECT = "book_reject"
    BOOK_FEATURE = "book_feature"

    # Character management
    CHARACTER_CREATE = "character_create"
    CHARACTER_UPDATE = "character_update"
    CHARACTER_DELETE = "character_delete"

    # System configuration
    CONFIG_UPDATE = "config_update"
    MODEL_CONFIG_UPDATE = "model_config_update"

    # Content moderation
    CONTENT_REVIEW = "content_review"
    CONTENT_REMOVE = "content_remove"


class Admin(SQLModel, table=True):
    """Admin user model"""
    __tablename__ = "admins"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Admin UUID",
        sa_column=Column(PGUUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    )
    username: str = Field(
        unique=True,
        index=True,
        min_length=3,
        max_length=50,
        description="Admin username"
    )
    email: str = Field(
        unique=True,
        index=True,
        description="Admin email"
    )
    password_hash: str = Field(description="Hashed password")
    role: str = Field(
        default=AdminRole.MODERATOR.value,
        description="Admin role",
        sa_column=Column(String(50))
    )
    status: str = Field(
        default=AdminStatus.ACTIVE.value,
        description="Account status",
        sa_column=Column(String(20))
    )
    permissions: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Additional permissions"
    )

    # Security fields
    last_login: Optional[datetime] = Field(default=None)
    last_password_change: Optional[datetime] = Field(default=None)
    failed_login_attempts: int = Field(default=0)
    locked_until: Optional[datetime] = Field(default=None)
    two_factor_enabled: bool = Field(default=False)
    two_factor_secret: Optional[str] = Field(default=None)

    # Profile fields
    display_name: str = Field(max_length=100)
    avatar_url: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None, max_length=20)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": func.now()}
    )
    created_by: Optional[str] = Field(
        default=None,
        sa_column=Column(PGUUID(as_uuid=False), nullable=True)
    )

    # Relationships - commented out to avoid initialization issues
    # audit_logs: List["AuditLog"] = Relationship(back_populates="admin")

    def has_permission(self, permission: str) -> bool:
        """Check if admin has specific permission"""
        # Super admin has all permissions
        if self.role == AdminRole.SUPER_ADMIN.value:
            return True

        # Check role-based permissions
        role_permissions = self.get_role_permissions()
        if permission in role_permissions:
            return True

        # Check additional permissions
        return permission in self.permissions

    def get_role_permissions(self) -> List[str]:
        """Get permissions based on role"""
        if self.role == AdminRole.SUPER_ADMIN.value:
            return ["*"]  # All permissions
        elif self.role == AdminRole.ADMIN.value:
            return [
                "users:read", "users:write",
                "books:read", "books:write",
                "uploads:read", "uploads:write", "uploads:review",
                "statistics:read",
                "config:read"
            ]
        elif self.role == AdminRole.MODERATOR.value:
            return [
                "users:read",
                "books:read", "books:write",
                "uploads:read", "uploads:review",
                "statistics:read"
            ]
        return []


class AdminToken(SQLModel, table=True):
    """Admin authentication tokens"""
    __tablename__ = "admin_tokens"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        sa_column=Column(PGUUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    )
    admin_id: str = Field(sa_column=Column(PGUUID(as_uuid=False), index=True))
    token: str = Field(unique=True, index=True)
    refresh_token: Optional[str] = Field(unique=True, index=True)
    expires_at: datetime = Field()
    refresh_expires_at: Optional[datetime] = Field()
    revoked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Track token usage
    last_used_at: Optional[datetime] = Field(default=None)
    usage_count: int = Field(default=0)
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)


class AuditLog(SQLModel, table=True):
    """Audit log for admin actions"""
    __tablename__ = "audit_logs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        sa_column=Column(PGUUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    )
    admin_id: str = Field(sa_column=Column(PGUUID(as_uuid=False), index=True))
    action: str = Field(sa_column=Column(String(50), index=True))
    entity_type: Optional[str] = Field(
        default=None,
        index=True,
        description="Type of entity affected (user, book, etc.)"
    )
    entity_id: Optional[str] = Field(
        default=None,
        index=True,
        description="ID of the affected entity"
    )

    # Action details
    description: str = Field(description="Human-readable description")
    old_values: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Previous values before change"
    )
    new_values: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="New values after change"
    )
    extra_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional metadata"
    )

    # Request information
    ip_address: Optional[str] = Field(default=None)
    user_agent: Optional[str] = Field(default=None)
    request_id: Optional[str] = Field(default=None, index=True)

    # Result
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None)

    # Timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Relationships - commented out to avoid initialization issues
    # admin: Optional[Admin] = Relationship(back_populates="audit_logs")


class SystemConfig(SQLModel, table=True):
    """System configuration settings"""
    __tablename__ = "system_configs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        sa_column=Column(PGUUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    )
    key: str = Field(unique=True, index=True, max_length=100)
    value: Dict[str, Any] = Field(sa_column=Column(JSON))
    category: str = Field(index=True, max_length=50)
    description: Optional[str] = Field(default=None)

    # Version control
    version: int = Field(default=1)
    is_active: bool = Field(default=True)

    # Audit
    updated_by: str = Field(foreign_key="auth.admins.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": func.now()}
    )


class AIModelConfig(SQLModel, table=True):
    """AI model configuration"""
    __tablename__ = "ai_model_configs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        sa_column=Column(PGUUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    )
    name: str = Field(unique=True, index=True)
    provider: str = Field(index=True)  # openai, anthropic, qwen, etc.
    model: str = Field()
    api_endpoint: str = Field()
    api_key_encrypted: str = Field()  # Encrypted API key

    # Model parameters
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON)
    )

    # Usage and routing
    is_primary: bool = Field(default=False)
    is_backup: bool = Field(default=False)
    routing_rules: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON)
    )

    # Cost and limits
    cost_per_1k_input_tokens: float = Field(default=0.0)
    cost_per_1k_output_tokens: float = Field(default=0.0)
    monthly_budget: Optional[float] = Field(default=None)
    current_month_cost: float = Field(default=0.0)

    # Health and monitoring
    status: str = Field(default="active")  # active, inactive, error
    last_health_check: Optional[datetime] = Field(default=None)
    last_error: Optional[str] = Field(default=None)
    average_latency_ms: Optional[float] = Field(default=None)
    success_rate: Optional[float] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": func.now()}
    )
    updated_by: str = Field(foreign_key="auth.admins.id")