"""
Book related schemas
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class CategoryEnum(str, Enum):
    BUSINESS = "business"
    PSYCHOLOGY = "psychology"
    FICTION = "fiction"
    SCIENCE = "science"
    HISTORY = "history"
    PHILOSOPHY = "philosophy"


class SortEnum(str, Enum):
    POPULAR = "popular"
    NEWEST = "newest"
    MOST_DISCUSSED = "most_discussed"


class PeriodEnum(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    ALL = "all"


class BookTypeEnum(str, Enum):
    AI_KNOWN = "ai_known"
    VECTORIZED = "vectorized"


class Character(BaseModel):
    """Character schema"""
    id: str
    name: str
    alias: List[str] = []
    description: str
    personality: Optional[str] = None
    dialogue_count: int = 0
    enabled: bool = True

    class Config:
        from_attributes = True


class Book(BaseModel):
    """Basic book schema (for list views) matching API spec"""
    id: str
    title: str
    author: str
    cover: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    dialogue_count: int = 0
    rating: float = Field(default=0.0, ge=0, le=5)
    created_at: datetime

    class Config:
        from_attributes = True


class BookDetail(Book):
    """Detailed book schema matching API spec"""
    type: BookTypeEnum
    chapters: Optional[int] = None
    estimated_reading_time: Optional[int] = None  # in minutes
    characters: List[Character] = []
    tags: List[str] = []
    uploader: Optional[Dict[str, str]] = None  # {id, nickname}

    class Config:
        from_attributes = True


class BookList(BaseModel):
    """Book list response with pagination"""
    books: List[Book]
    pagination: Dict[str, Any]

    class Config:
        from_attributes = True


# Aliases for backwards compatibility
BookResponse = Book
CharacterResponse = Character
BookCreate = BaseModel
BookUpdate = BaseModel