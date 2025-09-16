"""
Search related schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from .book import Book


class SearchTypeEnum(str, Enum):
    QUESTION = "question"
    TITLE = "title"
    AUTHOR = "author"


class SearchParams(BaseModel):
    """Search parameters schema"""
    q: str = Field(..., min_length=1, max_length=200, description="Search query")
    type: SearchTypeEnum = Field(default=SearchTypeEnum.QUESTION)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=50)


class BookSearchParams(BaseModel):
    """Book title search parameters"""
    title: str = Field(..., min_length=1, max_length=200)
    exact: bool = False


class SearchResult(BaseModel):
    """Individual search result"""
    book: Book
    relevance_score: float = Field(ge=0, le=100)
    matched_chapters: List[Dict[str, Any]] = []


class SearchResults(BaseModel):
    """Search results response matching API spec"""
    query: str
    type: str
    results: List[SearchResult]
    total: int
    page: int
    limit: int

    class Config:
        from_attributes = True