"""
User related schemas
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, field_validator
from enum import Enum


class MembershipTypeEnum(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    SUPER = "super"


class PaymentMethod(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"


class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    nickname: str


class UserUpdate(BaseModel):
    """Schema for updating user profile (PATCH /users/profile)"""
    nickname: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Basic user response schema"""
    id: str
    username: str
    nickname: str
    avatar: Optional[str] = None
    membership: str
    points: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfile(UserResponse):
    """User profile response (GET /users/profile) matching API spec"""
    phone: Optional[str] = None
    wechat_openid: Optional[str] = None
    email: Optional[str] = None
    membership: str
    total_dialogues: int = 0
    total_uploads: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True


class QuotaResponse(BaseModel):
    """User quota response (GET /users/quota) matching API spec"""
    total: int
    used: int
    remaining: int
    reset_at: datetime

    class Config:
        from_attributes = True


class Membership(BaseModel):
    """Membership details (GET /users/membership) matching API spec"""
    type: str = Field(..., description="Membership type")
    expires_at: Optional[datetime] = Field(None, description="Expiry date for paid memberships")
    quota_total: int = Field(..., description="Total quota for current period")
    quota_used: int = Field(..., description="Used quota in current period")
    quota_reset_at: datetime = Field(..., description="When quota resets")
    benefits: List[str] = Field(default_factory=list, description="List of membership benefits")

    class Config:
        from_attributes = True


class MembershipResponse(Membership):
    """Alias for Membership to match existing code"""
    pass


class MembershipUpgrade(BaseModel):
    """Request schema for membership upgrade (POST /users/membership/upgrade)"""
    plan: str = Field(..., description="Target membership plan", pattern="^(basic|premium|super)$")
    duration: int = Field(1, description="Duration in months", ge=1, le=12)
    payment_method: PaymentMethod = Field(..., description="Payment method")

    @field_validator("duration")
    def validate_duration(cls, v):
        if v not in [1, 3, 6, 12]:
            raise ValueError("Duration must be 1, 3, 6, or 12 months")
        return v


class PaymentOrder(BaseModel):
    """Payment order response schema"""
    order_id: str
    user_id: str
    type: str = "membership"
    amount: float
    currency: str = "CNY"
    status: str = "pending"
    payment_method: str
    payment_url: str = Field(..., description="URL or QR code for payment")
    expires_at: datetime = Field(..., description="Order expiry time")
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DialogueSession(BaseModel):
    """Dialogue session schema for history"""
    id: str
    book_id: str
    book_title: str
    type: str = Field(..., description="book or character")
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    user_id: str
    message_count: int
    last_message_at: Optional[datetime] = None
    created_at: datetime
    status: str = Field("active", description="active or ended")

    class Config:
        from_attributes = True


class DialogueHistoryResponse(BaseModel):
    """Response schema for dialogue history (GET /users/history)"""
    sessions: List[DialogueSession]
    pagination: Dict[str, Any]

    class Config:
        from_attributes = True