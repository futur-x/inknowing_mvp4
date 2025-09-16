"""
Book management API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from services.book import BookService
from schemas.book import (
    Book,
    BookDetail,
    BookList,
    Character,
    CategoryEnum,
    SortEnum,
    PeriodEnum,
)

router = APIRouter()


@router.get("/books", response_model=BookList)
async def list_books(
    category: Optional[CategoryEnum] = None,
    sort: SortEnum = Query(default=SortEnum.POPULAR),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of available books

    - **category**: Filter by book category
    - **sort**: Sort order (popular, newest, most_discussed)
    - **page**: Page number
    - **limit**: Items per page (max 50)
    """
    service = BookService(db)
    return await service.list_books(
        category=category.value if category else None,
        sort=sort.value,
        page=page,
        limit=limit,
    )


@router.get("/books/popular")
async def get_popular_books(
    period: PeriodEnum = Query(default=PeriodEnum.WEEK),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of most popular books based on dialogue count

    - **period**: Time period for popularity (today, week, month, all)
    - **limit**: Number of books to return (max 50)
    """
    service = BookService(db)
    return await service.get_popular_books(period=period.value, limit=limit)


@router.get("/books/{book_id}", response_model=BookDetail)
async def get_book_detail(
    book_id: str = Path(..., description="Book ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific book

    Returns book details including:
    - Basic book information
    - Available characters for dialogue
    - Book type (AI known or vectorized)
    - Reading time estimate
    - Tags and metadata
    """
    service = BookService(db)
    result = await service.get_book_detail(book_id)

    # Convert dict to BookDetail schema
    return BookDetail(**result)


@router.get("/books/{book_id}/characters")
async def get_book_characters(
    book_id: str = Path(..., description="Book ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of available dialogue characters for a book

    Returns all active characters that users can have dialogues with.
    """
    service = BookService(db)
    return await service.get_book_characters(book_id)