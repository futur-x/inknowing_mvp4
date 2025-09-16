"""
Book character model mapping to content.characters table
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
    ForeignKey,
    ARRAY,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB
from sqlalchemy.orm import relationship

from config.database import Base


class BookCharacter(Base):
    __tablename__ = "characters"
    __table_args__ = {"schema": "content"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    character_id = Column(String(50), unique=True, nullable=False)
    book_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("content.books.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Character information
    name = Column(String(200), nullable=False)
    full_name = Column(String(500))
    alias = Column(ARRAY(Text))
    description = Column(Text)
    biography = Column(Text)
    personality = Column(Text)
    role = Column(String(50))  # protagonist, antagonist, supporting, minor

    # AI Configuration for dialogue
    personality_prompt = Column(Text)
    dialogue_style = Column(JSONB)
    key_memories = Column(ARRAY(Text))
    example_dialogues = Column(JSONB)

    # Statistics
    dialogue_count = Column(Integer, default=0)
    user_rating = Column(Integer)

    # Status
    is_active = Column(Boolean, default=True)
    is_ai_generated = Column(Boolean, default=False)

    # Metadata
    metadata = Column(JSONB)
    created_by = Column(String(50))  # 'ai_extracted', 'admin_created'

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    book = relationship("Book", back_populates="characters")
    dialogue_sessions = relationship("DialogueSession", back_populates="character")