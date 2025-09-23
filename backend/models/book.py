"""
Book model mapping to content.books and related tables
"""
from datetime import datetime
import enum
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    Integer,
    Numeric,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from backend.config.database import Base


class BookType(str, enum.Enum):
    ai_known = "ai_known"
    vectorized = "vectorized"


class BookStatus(str, enum.Enum):
    draft = "draft"
    processing = "processing"
    published = "published"
    offline = "offline"
    review = "review"


class Book(Base):
    __tablename__ = "books"
    __table_args__ = {"schema": "content"}

    # Primary key
    id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    book_id = Column(String(50), nullable=False, unique=True)

    # Basic information
    title = Column(String(500), nullable=False)
    author = Column(String(255), nullable=False)
    isbn = Column(String(20))
    cover_url = Column(String(1000))

    # Classification
    category = Column(String(50))
    subcategory = Column(String(50))

    # Content
    description = Column(Text)
    synopsis = Column(Text)

    # Type and status
    type = Column(
        Enum(BookType, name="book_type", create_type=False), nullable=False
    )
    status = Column(
        Enum(BookStatus, name="book_status", create_type=False),
        default=BookStatus.draft,
    )
    source = Column(String(20), default="admin")

    # Statistics
    dialogue_count = Column(Integer, default=0)
    character_dialogue_count = Column(Integer, default=0)
    rating = Column(Numeric(2, 1), default=0.0)
    rating_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    favorite_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)

    # Metadata
    language = Column(String(10), default="zh-CN")
    original_language = Column(String(10))
    publish_year = Column(Integer)
    publisher = Column(String(255))
    page_count = Column(Integer)
    word_count = Column(Integer)
    chapters = Column(Integer)
    estimated_reading_time = Column(Integer)
    # difficulty_level = Column(String(20))  # TODO: Add this column to database

    # Upload related
    uploader_id = Column(PostgresUUID(as_uuid=True))

    # AI/Vector related
    ai_known = Column(Boolean, default=False)
    ai_model_tested = Column(String(100))
    vector_status = Column(String(20))
    vector_count = Column(Integer)
    vector_model = Column(String(100))
    vector_dimension = Column(Integer)

    # Tags
    # tags = Column(JSONB)  # TODO: Add this column to database
    # keywords = Column(JSONB)  # TODO: Add this column to database
    seo_keywords = Column(ARRAY(Text))  # Use existing seo_keywords column instead

    # Cost tracking
    total_api_cost = Column(Numeric(10, 4), default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships (defined in separate files to avoid circular imports)
    # characters = relationship("BookCharacter", back_populates="book")
    # chapters = relationship("BookChapter", back_populates="book")

    def __repr__(self):
        return f"<Book {self.title} by {self.author}>"


class BookCharacter(Base):
    __tablename__ = "book_characters"
    __table_args__ = {"schema": "content"}

    id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    book_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    character_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    alias = Column(JSONB)
    description = Column(Text)
    personality = Column(Text)
    personality_prompt = Column(Text)
    dialogue_style = Column(JSONB)
    key_memories = Column(JSONB)
    example_dialogues = Column(JSONB)
    dialogue_count = Column(Integer, default=0)
    enabled = Column(Boolean, default=True)
    created_by = Column(String(20), default="ai_extracted")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<BookCharacter {self.name}>"


class BookChapter(Base):
    __tablename__ = "book_chapters"
    __table_args__ = {"schema": "content"}

    id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    book_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(500))
    content = Column(Text)
    word_count = Column(Integer)
    vector_ids = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<BookChapter {self.chapter_number}: {self.title}>"