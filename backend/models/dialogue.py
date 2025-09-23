"""
Dialogue related models using SQLAlchemy
"""
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime,
    ForeignKey, Boolean, JSON
)
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.config.database import Base


class DialogueType(str, PyEnum):
    """Dialogue type"""
    BOOK = "book"
    CHARACTER = "character"


class DialogueStatus(str, PyEnum):
    """Dialogue session status"""
    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"


class MessageRole(str, PyEnum):
    """Message role in dialogue"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DialogueSession(Base):
    """Dialogue session model"""
    __tablename__ = "dialogue_sessions"

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False, index=True)
    book_id = Column(PostgresUUID(as_uuid=True), ForeignKey("content.books.id"), nullable=False, index=True)

    # Session info
    type = Column(ENUM('book', 'character', name='dialogue_type', create_type=False), nullable=False)
    status = Column(ENUM('active', 'ended', 'expired', name='dialogue_status', create_type=False), default='active', nullable=False)
    initial_question = Column(Text)
    message_count = Column(Integer, default=0)

    # Usage tracking - simplified for now
    total_input_tokens = Column(Integer, default=0)
    total_output_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_message_at = Column(DateTime)
    ended_at = Column(DateTime)

    # Relationships
    messages = relationship("DialogueMessage", back_populates="session", cascade="all, delete-orphan")

    def calculate_cost(self, input_tokens: int, output_tokens: int, model_config: Dict) -> float:
        """Calculate cost for tokens"""
        input_cost = (input_tokens / 1000) * model_config.get("cost_per_1k_input_tokens", 0)
        output_cost = (output_tokens / 1000) * model_config.get("cost_per_1k_output_tokens", 0)
        return input_cost + output_cost


class DialogueMessage(Base):
    """Individual dialogue message"""
    __tablename__ = "dialogue_messages"

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign key
    session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("dialogue_sessions.id"), nullable=False, index=True)

    # Message identification
    message_id = Column(String(100), nullable=False, default=lambda: str(uuid4()))

    # Message content
    role = Column(ENUM('user', 'assistant', 'system', name='message_role', create_type=False), nullable=False)
    content = Column(Text, nullable=False)
    content_type = Column(String(50))  # text, markdown, code, etc.

    # References (split into separate columns in the actual database)
    reference_type = Column(String(50))  # paragraph, chapter, etc.
    reference_id = Column(String(100))
    reference_text = Column(Text)
    reference_metadata = Column(JSON)

    # Token usage and model
    tokens_used = Column(Integer)
    model_used = Column(String(100))

    # Performance metrics
    response_time_ms = Column(Integer)
    confidence_score = Column(Float)
    moderation_score = Column(Float)

    # Streaming support
    is_streaming = Column(Boolean, default=False)
    stream_completed = Column(Boolean, default=True)

    # Error handling
    error_code = Column(String(50))
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

    # User feedback
    is_liked = Column(Boolean)
    is_reported = Column(Boolean, default=False)
    report_reason = Column(String(100))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session = relationship("DialogueSession", back_populates="messages")


class DialogueContext(Base):
    """Stored dialogue context for continuation"""
    __tablename__ = "dialogue_contexts"

    # Primary key (session_id is the primary key, not a separate id)
    session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("dialogue_sessions.id"), primary_key=True, nullable=False)

    # Context data
    context_messages = Column(JSON, default=list)
    context_tokens = Column(Integer, default=0)
    max_context_tokens = Column(Integer, default=4000)

    # Conversation summary
    conversation_summary = Column(Text)
    summary_updated_at = Column(DateTime)

    # Key information
    key_topics = Column(JSON, default=list)  # Array of topics
    key_entities = Column(JSON, default=dict)  # JSON object
    user_preferences = Column(JSON, default=dict)

    # Vector search related
    vector_collection_id = Column(String(100))
    vector_ids = Column(JSON, default=list)  # Array of vector IDs

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=func.now())


class AIUsageTracking(Base):
    """Track AI model usage and costs"""
    __tablename__ = "ai_usage_tracking"

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False, index=True)
    session_id = Column(PostgresUUID(as_uuid=True), ForeignKey("dialogue_sessions.id"), index=True)

    # Model info
    provider = Column(String(50), nullable=False)  # AI provider (openai, anthropic, etc.)
    model = Column(String(100), nullable=False)  # Model name
    feature = Column(String(50), nullable=False, index=True)  # Feature using AI

    # Usage metrics
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)  # Cost in USD

    # Performance
    latency_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)

    # Metadata
    extra_data = Column(JSON)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)


class PromptTemplate(Base):
    """Prompt templates for different scenarios"""
    __tablename__ = "prompt_templates"

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Template identification
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(50), index=True, nullable=False)

    # Template content
    system_prompt = Column(Text, nullable=False)
    user_prompt_template = Column(Text, nullable=False)

    # Variables and configuration
    required_variables = Column(JSON, default=list)
    optional_variables = Column(JSON, default=list)
    default_values = Column(JSON, default=dict)

    # Model preferences
    preferred_models = Column(JSON, default=list)
    model_parameters = Column(JSON, default=dict)

    # Version control
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    # Performance metrics
    usage_count = Column(Integer, default=0)
    average_rating = Column(Float)
    average_tokens = Column(Integer)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=func.now())
    # created_by = Column(PostgresUUID(as_uuid=True), ForeignKey("auth.admins.id"))  # Commented out - table doesn't exist