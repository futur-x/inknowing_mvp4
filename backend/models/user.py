"""
User model mapping to auth.users table
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from backend.config.database import Base


class MembershipType(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    SUPER = "super"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True)

    # Authentication fields
    username = Column(String(50), nullable=False, unique=True)
    phone = Column(String(20), unique=True)
    phone_verified = Column(Boolean, default=False)
    wechat_openid = Column(String(100), unique=True)
    wechat_unionid = Column(String(100))
    email = Column(String(255), unique=True)
    password_hash = Column(String(255))

    # Profile fields
    avatar = Column(String(500))
    nickname = Column(String(100), nullable=False)

    # Membership fields
    membership = Column(
        Enum(MembershipType, name="membership_type", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=MembershipType.FREE.value,
    )
    membership_expires_at = Column(DateTime)
    membership_auto_renew = Column(Boolean, default=False)

    # Statistics
    points = Column(Integer, default=0)
    total_dialogues = Column(Integer, default=0)
    total_uploads = Column(Integer, default=0)

    # Status fields
    status = Column(
        Enum(UserStatus, name="user_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=UserStatus.ACTIVE.value,
    )
    last_login_at = Column(DateTime)
    login_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<User {self.username}>"

    @property
    def is_active(self) -> bool:
        """Check if user is active"""
        return self.status == UserStatus.ACTIVE and self.deleted_at is None

    @property
    def is_premium(self) -> bool:
        """Check if user has premium membership"""
        return self.membership in [
            MembershipType.BASIC,
            MembershipType.PREMIUM,
            MembershipType.SUPER,
        ]

    @property
    def membership_active(self) -> bool:
        """Check if membership is still active"""
        if self.membership == MembershipType.FREE:
            return True
        if self.membership_expires_at is None:
            return False
        return self.membership_expires_at > datetime.utcnow()


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"schema": "auth"}

    user_id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    bio = Column(Text)
    location = Column(String(100))
    website = Column(String(255))
    birthday = Column(DateTime)
    gender = Column(String(10))
    language = Column(String(10), default="zh-CN")
    timezone = Column(String(50), default="Asia/Shanghai")
    notification_enabled = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    privacy_settings = Column(Text)  # JSON field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserQuota(Base):
    __tablename__ = "user_quotas"
    __table_args__ = {"schema": "auth"}

    user_id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    quota_type = Column(String(20), nullable=False)
    total_quota = Column(Integer, nullable=False)
    used_quota = Column(Integer, default=0)
    period_type = Column(String(20), nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    last_reset_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Token(Base):
    __tablename__ = "tokens"
    __table_args__ = {"schema": "auth"}

    id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    token_type = Column(String(20), nullable=False)
    token_hash = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime)