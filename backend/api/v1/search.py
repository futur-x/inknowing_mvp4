"""
Search API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from services.search import SearchService
from schemas.search import (
    SearchTypeEnum,
    SearchResults,
    BookSearchParams
)
from schemas.book import BookList

router = APIRouter()


@router.get("/search", response_model=SearchResults)
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    type: SearchTypeEnum = Query(default=SearchTypeEnum.QUESTION),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for books by question, title, or author

    Search types:
    - **question**: Search for books that can answer your question (AI-powered)
    - **title**: Search books by title
    - **author**: Search books by author name

    The question search uses AI to find books most relevant to answering your query.
    """
    service = SearchService(db)
    return await service.search(
        query=q,
        search_type=type.value,
        page=page,
        limit=limit
    )


@router.get("/search/books", response_model=BookList)
async def search_books_by_title(
    title: str = Query(..., min_length=1, max_length=200),
    exact: bool = Query(default=False),
    db: AsyncSession = Depends(get_db)
):
    """
    Search books specifically by title

    - **title**: Book title to search for
    - **exact**: If true, only exact matches are returned (case-insensitive)
    """
    service = SearchService(db)
    return await service.search_books_by_title(title=title, exact=exact)