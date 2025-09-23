"""
Admin dialogue management schemas
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class AdminUserInfo(BaseModel):
    """Admin view of user information"""
    id: str
    nickname: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    total_dialogues: Optional[int] = None
    subscription_level: Optional[str] = None


class AdminBookInfo(BaseModel):
    """Admin view of book information"""
    id: str
    title: str
    author: Optional[str] = None
    cover_url: Optional[str] = None


class AdminDialogueListItem(BaseModel):
    """Dialogue list item for admin"""
    id: str
    user: Dict[str, Any]
    book: Dict[str, Any]
    status: str
    message_count: int
    created_at: datetime
    ended_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    total_tokens: int
    sentiment_score: Optional[float] = None


class AdminDialogueListResponse(BaseModel):
    """Paginated dialogue list response"""
    items: List[AdminDialogueListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class AdminDialogueMessage(BaseModel):
    """Admin view of dialogue message"""
    id: str
    role: str
    content: str
    created_at: datetime
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    is_flagged: bool = False
    is_hidden: bool = False
    references: Optional[List[Dict[str, Any]]] = None
    confidence_score: Optional[float] = None
    moderation_score: Optional[float] = None


class AdminDialogueMetrics(BaseModel):
    """Dialogue metrics for admin"""
    avg_response_time: float
    user_satisfaction: Optional[float] = None
    ai_confidence: float
    sentiment_score: Optional[float] = None
    total_cost: Optional[float] = None


class AdminDialogueDetailResponse(BaseModel):
    """Detailed dialogue information for admin"""
    id: str
    user: AdminUserInfo
    book: AdminBookInfo
    status: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    message_count: int
    total_tokens: int
    total_cost: float
    messages: List[AdminDialogueMessage]
    metrics: AdminDialogueMetrics
    context: Optional[Dict[str, Any]] = None


class AdminDialogueMessageResponse(BaseModel):
    """Response for dialogue message operations"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class AdminDialogueStatsResponse(BaseModel):
    """Dialogue statistics response"""
    total_sessions: int
    active_sessions: int
    period_sessions: int  # Sessions in selected period
    avg_response_time: float
    total_messages: int
    user_satisfaction: float
    date_range: str
    trend_data: Optional[List[Dict[str, Any]]] = None


class AdminInterventionRequest(BaseModel):
    """Admin intervention request"""
    message: str = Field(..., min_length=1, max_length=1000)
    notify_user: bool = True
    end_session_after: bool = False


class AdminMessageUpdateRequest(BaseModel):
    """Request to update message properties"""
    is_hidden: Optional[bool] = None
    is_flagged: Optional[bool] = None
    flag_reason: Optional[str] = None
    moderation_notes: Optional[str] = None


class AdminDialogueExportRequest(BaseModel):
    """Export dialogue data request"""
    dialogue_ids: Optional[List[UUID]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_messages: bool = True
    include_metadata: bool = False
    format: str = Field("json", pattern="^(json|csv|xlsx)$")


class AdminDialogueFilterParams(BaseModel):
    """Filter parameters for dialogue queries"""
    search: Optional[str] = None
    status: Optional[str] = None
    user_id: Optional[UUID] = None
    book_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    flagged_only: bool = False
    has_intervention: bool = False
    min_messages: Optional[int] = None
    max_messages: Optional[int] = None


class AdminRealtimeMessage(BaseModel):
    """Real-time message for WebSocket"""
    type: str  # new_message, session_update, session_end, etc.
    session_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    book_title: Optional[str] = None
    message: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AdminBatchActionRequest(BaseModel):
    """Batch action request"""
    dialogue_ids: List[UUID]
    action: str = Field(..., pattern="^(flag|unflag|end|delete|export)$")
    params: Optional[Dict[str, Any]] = None


class AdminDialogueAnalytics(BaseModel):
    """Analytics data for dialogues"""
    total_sessions_by_day: List[Dict[str, Any]]
    avg_session_duration: float
    peak_hours: List[Dict[str, Any]]
    popular_books: List[Dict[str, Any]]
    user_engagement_score: float
    ai_performance_metrics: Dict[str, Any]
    error_rate: float
    satisfaction_trend: List[Dict[str, Any]]