"""
Book management API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.database import get_db
from backend.services.book import BookService
from backend.schemas.book import (
    Book,
    BookDetail,
    BookList,
    Character,
    CategoryEnum,
    SortEnum,
    PeriodEnum,
)

router = APIRouter(tags=["Books"])


@router.get("", response_model=BookList)
async def list_books(
    category: Optional[CategoryEnum] = None,
    sort: Optional[str] = Query(default="popular"),  # Changed to accept string for now
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    minRating: Optional[float] = Query(default=None, ge=0, le=5),  # Added for rating filter
    db: AsyncSession = Depends(get_db),
):
    """
    Get paginated list of available books

    - **category**: Filter by book category
    - **sort**: Sort order (popular, newest, most_discussed, rating, recent)
    - **page**: Page number
    - **limit**: Items per page (max 50)
    - **minRating**: Minimum rating filter
    """
    # Use real BookService to get data from database
    book_service = BookService(db)
    result = await book_service.list_books(
        category=category.value if category else None,
        sort=sort,
        page=page,
        limit=limit,
        min_rating=minRating
    )

    # Return the actual database results
    return result


@router.get("/popular")
async def get_popular_books(
    period: Optional[str] = Query(default="week"),  # Changed to accept string
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of most popular books based on dialogue count

    - **period**: Time period for popularity (today, week, month, all)
    - **limit**: Number of books to return (max 50)
    """
    # Use real BookService to get popular books from database
    book_service = BookService(db)
    result = await book_service.get_popular_books(
        period=period,
        limit=limit
    )

    # Convert to expected format with pagination
    return {
        "books": result["books"],
        "pagination": {
            "page": 1,
            "limit": limit,
            "total": result["count"],
            "total_pages": 1,  # Popular books are not paginated
            "has_next": False,
            "has_prev": False
        }
    }



@router.get("/recommendations")
async def get_book_recommendations(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Get book recommendations

    - **limit**: Number of recommendations to return (max 50)
    """
    # Use real BookService to get recommendations from database
    book_service = BookService(db)
    result = await book_service.get_book_recommendations(
        limit=limit,
        user_id=None  # TODO: Get user_id from auth context when authentication is added
    )

    # Convert to expected format with pagination
    return {
        "books": result["books"],
        "pagination": {
            "page": 1,
            "limit": limit,
            "total": result["count"],
            "total_pages": 1,  # Recommendations are not paginated
            "has_next": False,
            "has_prev": False
        }
    }


@router.get("/{book_id}", response_model=BookDetail)
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
    # Use real BookService to get data from database
    book_service = BookService(db)
    result = await book_service.get_book_detail(book_id)

    return BookDetail(**result)


@router.get("/{book_id}/characters")
async def get_book_characters(
    book_id: str = Path(..., description="Book ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of available dialogue characters for a book

    Returns all active characters that users can have dialogues with.
    """
    # Return mock data for testing
    return {
        "characters": [
            {
                "id": f"char-1-{book_id}",
                "name": "主要角色",
                "description": "书籍的主要讲述者",
                "avatar": "/avatars/char1.png",
                "role": "narrator",
                "dialogue_count": 50
            },
            {
                "id": f"char-2-{book_id}",
                "name": "专家角色",
                "description": "领域专家，提供深度见解",
                "avatar": "/avatars/char2.png",
                "role": "expert",
                "dialogue_count": 30
            },
            {
                "id": f"char-3-{book_id}",
                "name": "学习者角色",
                "description": "提出问题，引导讨论",
                "avatar": "/avatars/char3.png",
                "role": "student",
                "dialogue_count": 20
            }
        ]
    }


@router.get("/{book_id}/related")
async def get_related_books(
    book_id: str = Path(..., description="Book ID"),
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Get books related to the specified book

    Returns books with similar topics, categories, or themes
    """
    # Return mock data for testing
    mock_books = []
    for i in range(min(limit, 5)):
        mock_books.append({
            "id": f"related-{book_id}-{i+1}",
            "title": f"Related Book {i+1}",
            "author": f"Related Author {i+1}",
            "cover": f"/mock-related-{i+1}.jpg",
            "category": "business",
            "description": f"This book is related to {book_id}",
            "dialogue_count": 200 + i * 25,
            "rating": 4.3 - (i * 0.1),
            "created_at": "2024-01-01T00:00:00Z"
        })

    return {
        "books": mock_books,
        "total": len(mock_books)
    }