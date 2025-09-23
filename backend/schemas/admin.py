"""
Admin related schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, EmailStr, validator

from backend.models.admin import AdminRole, AdminStatus, AuditActionType
from backend.models.user import MembershipType, UserStatus
from backend.models.book import BookType, BookStatus


# ==================== Auth Schemas ====================
class AdminLogin(BaseModel):
    """Admin login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class AdminAuthResponse(BaseModel):
    """Admin authentication response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int
    admin: Dict[str, Any]


class AdminTokenRefresh(BaseModel):
    """Admin token refresh request"""
    refresh_token: str


# ==================== Admin Management Schemas ====================
class AdminBase(BaseModel):
    """Base admin schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    display_name: str = Field(..., max_length=100)
    role: AdminRole
    status: AdminStatus = AdminStatus.ACTIVE


class AdminCreate(AdminBase):
    """Admin creation schema"""
    password: str = Field(..., min_length=8)
    phone: Optional[str] = Field(None, max_length=20)
    permissions: List[str] = Field(default_factory=list)


class AdminUpdate(BaseModel):
    """Admin update schema"""
    display_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    status: Optional[AdminStatus] = None
    permissions: Optional[List[str]] = None


class AdminResponse(AdminBase):
    """Admin response schema"""
    id: str
    permissions: List[str]
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class AdminPasswordChange(BaseModel):
    """Admin password change request"""
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8)

    @validator('new_password')
    def validate_password(cls, v, values):
        if 'old_password' in values and v == values['old_password']:
            raise ValueError('New password must be different from old password')
        return v


# ==================== Dashboard Schemas ====================
class DashboardStats(BaseModel):
    """Dashboard statistics"""
    real_time: Dict[str, Any]
    today: Dict[str, Any]
    trending: Dict[str, Any]


class CostStatistics(BaseModel):
    """Cost statistics"""
    period: str
    total_cost: float
    breakdown: List[Dict[str, Any]]
    trend: List[Dict[str, Any]]
    projection: Dict[str, Any]


class DialogueStatistics(BaseModel):
    """Dialogue statistics"""
    period: str
    total_dialogues: int
    unique_users: int
    breakdown: List[Dict[str, Any]]
    satisfaction: Dict[str, Any]


class SystemAlert(BaseModel):
    """System alert"""
    id: str
    severity: str  # info, warning, error, critical
    type: str  # api_failure, high_cost, user_issue, system_performance
    message: str
    details: Optional[Dict[str, Any]] = None
    status: str  # active, acknowledged, resolved
    created_at: datetime
    resolved_at: Optional[datetime] = None


# ==================== User Management Schemas ====================
class AdminUserResponse(BaseModel):
    """Admin view of user"""
    id: str
    username: str
    phone: Optional[str] = None
    wechat_openid: Optional[str] = None
    email: Optional[str] = None
    nickname: str
    avatar: Optional[str] = None
    membership: MembershipType
    status: UserStatus
    points: int
    total_dialogues: int = 0
    total_uploads: int = 0
    last_active: Optional[datetime] = None
    quota_used: int = 0
    quota_limit: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class AdminUserUpdate(BaseModel):
    """Admin update user request"""
    status: Optional[UserStatus] = None
    membership: Optional[MembershipType] = None
    quota_override: Optional[int] = Field(None, ge=0)


class UserListResponse(BaseModel):
    """User list response"""
    users: List[AdminUserResponse]
    pagination: Dict[str, Any]


# ==================== Book Management Schemas ====================
class AdminBookBase(BaseModel):
    """Base book schema for admin"""
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    cover_url: Optional[str] = None
    isbn: Optional[str] = Field(None, max_length=20)
    tags: List[str] = Field(default_factory=list)


class AdminBookCreate(AdminBookBase):
    """Admin book creation schema"""
    type: BookType


class AdminBookUpdate(BaseModel):
    """Admin book update schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    author: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    cover_url: Optional[str] = None
    status: Optional[BookStatus] = None
    tags: Optional[List[str]] = None


class AdminBookResponse(AdminBookBase):
    """Admin book response"""
    id: str
    type: BookType
    status: BookStatus
    source: str  # admin, user_upload
    vector_status: Optional[str] = None
    vector_count: Optional[int] = None
    ai_model_tested: Optional[str] = None
    review_status: Optional[str] = None
    reviewer_id: Optional[str] = None
    review_notes: Optional[str] = None
    total_api_cost: float = 0.0
    dialogue_count: int = 0
    rating: float = 0.0
    uploader_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class BookListResponse(BaseModel):
    """Book list response"""
    books: List[AdminBookResponse]
    pagination: Dict[str, Any]


class BookReviewRequest(BaseModel):
    """Book review request"""
    action: str = Field(..., pattern="^(approve|reject|request_changes)$")
    reason: Optional[str] = Field(None, max_length=500)
    vectorize: bool = Field(True)


# ==================== Character Management Schemas ====================
class AdminCharacterBase(BaseModel):
    """Base character schema for admin"""
    name: str = Field(..., min_length=1, max_length=100)
    alias: List[str] = Field(default_factory=list)
    description: str = Field(..., max_length=500)
    personality: Optional[str] = Field(None, max_length=500)


class AdminCharacterCreate(AdminCharacterBase):
    """Admin character creation schema"""
    personality_prompt: Optional[str] = None
    dialogue_style: Optional[Dict[str, str]] = None
    key_memories: List[str] = Field(default_factory=list)
    example_dialogues: List[Dict[str, str]] = Field(default_factory=list)
    enabled: bool = True


class AdminCharacterUpdate(BaseModel):
    """Admin character update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    alias: Optional[List[str]] = None
    description: Optional[str] = Field(None, max_length=500)
    personality: Optional[str] = Field(None, max_length=500)
    personality_prompt: Optional[str] = None
    dialogue_style: Optional[Dict[str, str]] = None
    key_memories: Optional[List[str]] = None
    example_dialogues: Optional[List[Dict[str, str]]] = None
    enabled: Optional[bool] = None


class AdminCharacterResponse(AdminCharacterBase):
    """Admin character response"""
    id: str
    personality_prompt: Optional[str] = None
    dialogue_style: Optional[Dict[str, str]] = None
    key_memories: List[str] = Field(default_factory=list)
    example_dialogues: List[Dict[str, str]] = Field(default_factory=list)
    dialogue_count: int = 0
    enabled: bool
    created_by: str  # ai_extracted, admin_created
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# ==================== AI Model Schemas ====================
class AIModelBase(BaseModel):
    """Base AI model schema"""
    provider: str = Field(..., max_length=50)
    model: str = Field(..., max_length=100)
    api_endpoint: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AIModelCreate(AIModelBase):
    """AI model creation schema"""
    api_key: str
    name: str = Field(..., min_length=1, max_length=100)


class AIModelUpdate(BaseModel):
    """AI model update schema"""
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_primary: Optional[bool] = None
    is_backup: Optional[bool] = None
    routing_rules: Optional[Dict[str, Any]] = None


class AIModelResponse(AIModelBase):
    """AI model response"""
    id: str
    name: str
    api_key_configured: bool
    is_primary: bool
    is_backup: bool
    routing_rules: Dict[str, Any]
    monthly_cost: float
    status: str
    last_health_check: Optional[datetime] = None
    average_latency: Optional[float] = None

    class Config:
        orm_mode = True


class ModelConfig(BaseModel):
    """Model configuration response"""
    primary_model: Optional[Dict[str, Any]] = None
    backup_models: List[Dict[str, Any]] = Field(default_factory=list)
    routing_rules: Dict[str, Any] = Field(default_factory=dict)
    embedding_model: Dict[str, Any]


class ModelConfigUpdate(BaseModel):
    """Model configuration update request"""
    primary_model_id: Optional[str] = None
    backup_model_ids: Optional[List[str]] = None
    routing_rules: Optional[Dict[str, Any]] = None
    new_model: Optional[AIModelCreate] = None


class ModelTestRequest(BaseModel):
    """Model test request"""
    provider: str
    model: str
    api_endpoint: str
    api_key: str
    test_prompt: str = "Hello, can you introduce yourself?"


class ModelTestResult(BaseModel):
    """Model test result"""
    success: bool
    latency: Optional[float] = None
    response: Optional[str] = None
    error: Optional[str] = None
    estimated_cost: Optional[float] = None


class AICheckRequest(BaseModel):
    """AI book knowledge check request"""
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)


class AICheckResult(BaseModel):
    """AI check result"""
    ai_knows_book: bool
    confidence: float = Field(..., ge=0, le=100)
    detected_content: Dict[str, List[str]]
    recommendation: str  # use_ai_directly, needs_vectorization, manual_review_needed


# ==================== Audit Log Schemas ====================
class AuditLogResponse(BaseModel):
    """Audit log response"""
    id: str
    admin_id: str
    admin_username: Optional[str] = None
    action: AuditActionType
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class AuditLogListResponse(BaseModel):
    """Audit log list response"""
    logs: List[AuditLogResponse]
    pagination: Dict[str, Any]


# ==================== System Config Schemas ====================
class SystemConfigResponse(BaseModel):
    """System configuration response"""
    id: str
    key: str
    value: Dict[str, Any]
    category: str
    description: Optional[str] = None
    version: int
    is_active: bool
    updated_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SystemConfigUpdate(BaseModel):
    """System configuration update request"""
    value: Dict[str, Any]
    description: Optional[str] = None