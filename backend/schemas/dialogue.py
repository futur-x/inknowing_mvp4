"""
Dialogue related schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field

from backend.schemas.common import PaginationQuery, PaginatedResponse


# ==================== Dialogue Session ====================

class DialogueSessionCreate(BaseModel):
    """Create book dialogue session"""
    book_id: str
    initial_question: Optional[str] = None


class CharacterDialogueSessionCreate(BaseModel):
    """Create character dialogue session"""
    book_id: str
    character_id: str
    initial_message: Optional[str] = None


class DialogueSessionResponse(BaseModel):
    """Dialogue session response"""
    id: str
    book_id: str
    book_title: str
    type: str  # book or character
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    user_id: str
    message_count: int
    last_message_at: Optional[datetime]
    created_at: datetime
    status: str  # active, ended

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DialogueSessionDetail(DialogueSessionResponse):
    """Detailed dialogue session with stats"""
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost: float = 0.0
    discussed_topics: List[str] = []
    key_references: List[Dict[str, Any]] = []


# ==================== Dialogue Messages ====================

class DialogueMessageCreate(BaseModel):
    """Send dialogue message"""
    message: str = Field(..., min_length=1, max_length=2000)


class DialogueMessageResponse(BaseModel):
    """Dialogue message response"""
    id: str
    session_id: str
    role: str  # user, assistant, system
    content: str
    references: List[Dict[str, Any]] = []
    timestamp: datetime
    tokens_used: int = 0
    model_used: str

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DialogueMessageDetail(DialogueMessageResponse):
    """Detailed message with metadata"""
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0.0
    response_time_ms: Optional[int] = None
    user_rating: Optional[int] = None
    user_feedback: Optional[str] = None


# ==================== Dialogue Context ====================

class DialogueContextResponse(BaseModel):
    """Dialogue context response"""
    session_id: str
    book_context: Dict[str, Any]
    character_context: Optional[Dict[str, Any]] = None


class BookContext(BaseModel):
    """Book context in dialogue"""
    current_chapter: Optional[str] = None
    discussed_topics: List[str] = []
    key_references: List[Dict[str, Any]] = []


class CharacterContext(BaseModel):
    """Character context in dialogue"""
    character_state: Optional[str] = None
    emotional_tone: Optional[str] = None
    remembered_facts: List[str] = []


class DialogueContextDetail(BaseModel):
    """Detailed dialogue context"""
    session_id: str
    book_context: BookContext
    character_context: Optional[CharacterContext] = None


# ==================== Reference ====================

class Reference(BaseModel):
    """Reference in dialogue"""
    type: str  # chapter, page, paragraph, character_memory
    chapter: Optional[int] = None
    page: Optional[int] = None
    text: str
    highlight: Optional[str] = None


# ==================== Dialogue History ====================

class DialogueHistoryQuery(PaginationQuery):
    """Query dialogue history"""
    book_id: Optional[str] = None
    type: Optional[str] = None  # book or character


class DialogueHistoryResponse(PaginatedResponse):
    """Dialogue history response"""
    sessions: List[DialogueSessionResponse]


# ==================== WebSocket Messages ====================

class WSMessage(BaseModel):
    """WebSocket message base"""
    type: str


class WSUserMessage(WSMessage):
    """User message via WebSocket"""
    type: str = "message"
    content: str


class WSAssistantMessage(WSMessage):
    """Assistant response via WebSocket"""
    type: str = "response"
    content: str
    references: List[Reference] = []
    timestamp: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WSTypingIndicator(WSMessage):
    """Typing indicator via WebSocket"""
    type: str = "typing"
    isTyping: bool


class WSError(WSMessage):
    """Error message via WebSocket"""
    type: str = "error"
    message: str


# ==================== Streaming ====================

class StreamChunk(BaseModel):
    """Streaming response chunk"""
    content: str
    is_final: bool = False
    metadata: Optional[Dict[str, Any]] = None


# ==================== Analytics ====================

class DialogueStatistics(BaseModel):
    """Dialogue statistics"""
    period: str
    total_dialogues: int
    unique_users: int
    breakdown: List[Dict[str, Any]]
    satisfaction: Dict[str, Any]


class DialogueAnalytics(BaseModel):
    """Dialogue analytics"""
    session_id: str
    average_response_time_ms: float
    total_messages: int
    user_satisfaction_score: Optional[float] = None
    most_discussed_topics: List[str]
    peak_usage_time: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }