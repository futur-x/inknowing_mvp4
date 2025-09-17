"""
Dialogue related models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlmodel import Field, SQLModel, Relationship, Column, JSON
from sqlalchemy.sql import func


class DialogueType(str, Enum):
    """Dialogue type"""
    BOOK = "book"
    CHARACTER = "character"


class DialogueStatus(str, Enum):
    """Dialogue session status"""
    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"


class MessageRole(str, Enum):
    """Message role in dialogue"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DialogueSession(SQLModel, table=True):
    """Dialogue session model"""
    __tablename__ = "dialogue_sessions"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Session UUID"
    )
    user_id: str = Field(
        foreign_key="users.id",
        index=True,
        description="User ID"
    )
    book_id: str = Field(
        foreign_key="books.id",
        index=True,
        description="Book ID"
    )
    type: DialogueType = Field(
        description="Dialogue type (book or character)"
    )
    character_id: Optional[str] = Field(
        default=None,
        foreign_key="book_characters.id",
        index=True,
        description="Character ID for character dialogue"
    )

    # Session info
    status: DialogueStatus = Field(
        default=DialogueStatus.ACTIVE,
        description="Session status"
    )
    initial_question: Optional[str] = Field(
        default=None,
        description="Initial question that started the dialogue"
    )
    message_count: int = Field(
        default=0,
        description="Total messages in session"
    )

    # Context management
    context_summary: Optional[str] = Field(
        default=None,
        description="Summary of dialogue context"
    )
    discussed_topics: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Topics discussed in this session"
    )
    key_references: List[Dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Important references from the book"
    )

    # Character state (for character dialogues)
    character_state: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Character emotional and memory state"
    )

    # Usage tracking
    total_input_tokens: int = Field(
        default=0,
        description="Total input tokens used"
    )
    total_output_tokens: int = Field(
        default=0,
        description="Total output tokens used"
    )
    total_cost: float = Field(
        default=0.0,
        description="Total cost in USD"
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Session creation time"
    )
    last_message_at: Optional[datetime] = Field(
        default=None,
        description="Time of last message"
    )
    ended_at: Optional[datetime] = Field(
        default=None,
        description="Session end time"
    )

    # Relationships
    # messages: List["DialogueMessage"] = Relationship(
    #     back_populates="session"
    # )

    def calculate_cost(self, input_tokens: int, output_tokens: int, model_config: Dict) -> float:
        """Calculate cost for tokens"""
        input_cost = (input_tokens / 1000) * model_config.get("cost_per_1k_input_tokens", 0)
        output_cost = (output_tokens / 1000) * model_config.get("cost_per_1k_output_tokens", 0)
        return input_cost + output_cost


class DialogueMessage(SQLModel, table=True):
    """Individual dialogue message"""
    __tablename__ = "dialogue_messages"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Message UUID"
    )
    session_id: str = Field(
        foreign_key="dialogue_sessions.id",
        index=True,
        description="Session ID"
    )
    role: MessageRole = Field(
        description="Message role"
    )
    content: str = Field(
        description="Message content"
    )

    # References and context
    references: List[Dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Book/chapter references"
    )
    context_used: Optional[str] = Field(
        default=None,
        description="Context used for generating response"
    )

    # Vector search results (for RAG)
    vector_search_results: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Vector search results used"
    )

    # Model information
    model_used: str = Field(
        description="AI model used for response"
    )
    model_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Model parameters used"
    )

    # Token usage
    input_tokens: int = Field(
        default=0,
        description="Input tokens used"
    )
    output_tokens: int = Field(
        default=0,
        description="Output tokens generated"
    )
    cost: float = Field(
        default=0.0,
        description="Cost for this message"
    )

    # Performance metrics
    response_time_ms: Optional[int] = Field(
        default=None,
        description="Response generation time in milliseconds"
    )

    # User feedback
    user_rating: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="User rating for response"
    )
    user_feedback: Optional[str] = Field(
        default=None,
        description="User feedback text"
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Message creation time"
    )

    # Relationships
    session: Optional[DialogueSession] = Relationship(
        # back_populates="messages"
    )


class DialogueContext(SQLModel, table=True):
    """Stored dialogue context for continuation"""
    __tablename__ = "dialogue_contexts"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True
    )
    session_id: str = Field(
        foreign_key="dialogue_sessions.id",
        unique=True,
        index=True
    )

    # Context data
    full_context: str = Field(
        description="Full conversation context"
    )
    compressed_context: Optional[str] = Field(
        default=None,
        description="Compressed context for longer conversations"
    )

    # Book context
    current_chapter: Optional[int] = Field(
        default=None,
        description="Current chapter being discussed"
    )
    chapter_summaries: Dict[int, str] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Summaries of discussed chapters"
    )

    # Character context (for character dialogues)
    character_memories: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Important memories for character"
    )
    emotional_state: Optional[str] = Field(
        default=None,
        description="Current emotional state of character"
    )
    relationship_state: Optional[str] = Field(
        default=None,
        description="Relationship state with user"
    )

    # Metadata
    context_length: int = Field(
        default=0,
        description="Length of context in tokens"
    )
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": func.now()}
    )


class AIUsageTracking(SQLModel, table=True):
    """Track AI model usage and costs"""
    __tablename__ = "ai_usage_tracking"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True
    )
    user_id: str = Field(
        foreign_key="users.id",
        index=True
    )
    session_id: Optional[str] = Field(
        default=None,
        foreign_key="dialogue_sessions.id",
        index=True
    )

    # Model info
    provider: str = Field(description="AI provider (openai, anthropic, etc.)")
    model: str = Field(description="Model name")
    feature: str = Field(
        index=True,
        description="Feature using AI (dialogue, character_extraction, etc.)"
    )

    # Usage metrics
    input_tokens: int = Field(default=0)
    output_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    cost: float = Field(default=0.0, description="Cost in USD")

    # Performance
    latency_ms: Optional[int] = Field(
        default=None,
        description="Response latency in milliseconds"
    )
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None)

    # Metadata
    extra_data: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional tracking data"
    )

    # Timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )

    class Config:
        schema_extra = {
            "example": {
                "user_id": "user123",
                "session_id": "session456",
                "provider": "openai",
                "model": "gpt-4",
                "feature": "dialogue",
                "input_tokens": 150,
                "output_tokens": 200,
                "total_tokens": 350,
                "cost": 0.0105,
                "latency_ms": 1200,
                "success": True
            }
        }


class PromptTemplate(SQLModel, table=True):
    """Prompt templates for different scenarios"""
    __tablename__ = "prompt_templates"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True
    )
    name: str = Field(
        unique=True,
        index=True,
        description="Template name"
    )
    category: str = Field(
        index=True,
        description="Template category (dialogue, character, extraction, etc.)"
    )

    # Template content
    system_prompt: str = Field(
        description="System prompt template"
    )
    user_prompt_template: str = Field(
        description="User prompt template with placeholders"
    )

    # Variables and configuration
    required_variables: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Required template variables"
    )
    optional_variables: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Optional template variables"
    )
    default_values: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Default values for variables"
    )

    # Model preferences
    preferred_models: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON),
        description="Preferred models for this prompt"
    )
    model_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="Recommended model parameters"
    )

    # Version control
    version: int = Field(default=1)
    is_active: bool = Field(default=True)

    # Performance metrics
    usage_count: int = Field(default=0)
    average_rating: Optional[float] = Field(default=None)
    average_tokens: Optional[int] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": func.now()}
    )
    created_by: str = Field(foreign_key="admins.id")