"""
Authentication schemas for request/response validation
"""
from typing import Optional, Union, Literal
from datetime import datetime
from pydantic import BaseModel, Field, validator, EmailStr
import re

from models.user import MembershipType


class PhoneRegistration(BaseModel):
    type: Literal["phone"] = "phone"
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="Chinese phone number")
    code: str = Field(..., pattern=r"^\d{6}$", description="6-digit verification code")
    password: Optional[str] = Field(None, min_length=6)
    nickname: Optional[str] = Field(None, max_length=100)


class WeChatRegistration(BaseModel):
    type: Literal["wechat"] = "wechat"
    code: str = Field(..., description="WeChat authorization code")
    nickname: Optional[str] = Field(None, max_length=100)


class PhoneLogin(BaseModel):
    type: Literal["phone"] = "phone"
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    password: Optional[str] = Field(None, min_length=6)
    code: Optional[str] = Field(None, pattern=r"^\d{6}$")

    @validator("password", always=True)
    def validate_login_method(cls, v, values):
        code = values.get("code")
        if not v and not code:
            raise ValueError("Either password or verification code is required")
        return v


class WeChatLogin(BaseModel):
    type: Literal["wechat"] = "wechat"
    code: str = Field(..., description="WeChat authorization code")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="JWT refresh token")


class VerificationCodeRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")


class UserResponse(BaseModel):
    id: str
    username: str
    phone: Optional[str] = None
    phone_verified: bool = False
    email: Optional[str] = None
    avatar: Optional[str] = None
    nickname: str
    membership: Union[MembershipType, str]  # Accept both enum and string
    membership_expires_at: Optional[datetime] = None
    points: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

    @validator("id", pre=True)
    def validate_id(cls, v):
        # Convert UUID to string if needed
        return str(v)

    @validator("membership", pre=True)
    def validate_membership(cls, v):
        # Convert string to enum if needed
        if isinstance(v, str):
            return MembershipType(v)
        return v

    @validator("phone", always=True)
    def mask_phone(cls, v):
        if v and len(v) >= 11:
            return f"{v[:3]}****{v[-4:]}"
        return v

    @validator("email", always=True)
    def mask_email(cls, v):
        if v and "@" in v:
            username, domain = v.split("@")
            if len(username) > 3:
                return f"{username[0]}***@{domain}"
            return f"***@{domain}"
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(..., description="Token expiry time in seconds")
    user: UserResponse

# Alias for backward compatibility
AuthResponse = TokenResponse


class UserProfileResponse(BaseModel):
    user: UserResponse


class SendSMSCodeRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")


class SendSMSCodeResponse(BaseModel):
    success: bool
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)