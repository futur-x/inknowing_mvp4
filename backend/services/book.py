"""
Book service layer for business logic
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload

from models.book import Book, BookType, BookStatus, BookCharacter
from models.dialogue import DialogueSession
from core.exceptions import NotFoundException, BadRequestException


class BookService:
    """Service class for book-related business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_books(
        self,
        category: Optional[str] = None,
        sort: str = "popular",
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Get paginated list of available books"""
        # Base query - only published books
        query = select(Book).where(Book.status == BookStatus.PUBLISHED)

        # Apply category filter
        if category:
            query = query.where(Book.category == category)

        # Apply sorting
        if sort == "popular":
            query = query.order_by(desc(Book.dialogue_count))
        elif sort == "newest":
            query = query.order_by(desc(Book.created_at))
        elif sort == "most_discussed":
            query = query.order_by(desc(Book.dialogue_count))
        else:
            query = query.order_by(desc(Book.dialogue_count))

        # Count total before pagination
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.db.scalar(count_query)

        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        # Execute query
        result = await self.db.execute(query)
        books = result.scalars().all()

        # Format response with pagination
        return {
            "books": [self._format_book(book) for book in books],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit,
                "has_next": page * limit < total,
                "has_prev": page > 1,
            },
        }

    async def get_book_detail(self, book_id: str) -> Dict[str, Any]:
        """Get detailed book information"""
        # Query book with characters
        query = select(Book).where(
            Book.id == book_id, Book.status == BookStatus.PUBLISHED
        )
        result = await self.db.execute(query)
        book = result.scalar_one_or_none()

        if not book:
            raise NotFoundException("Book not found")

        # Get characters for this book
        char_query = select(BookCharacter).where(
            BookCharacter.book_id == book.id, BookCharacter.enabled == True
        )
        char_result = await self.db.execute(char_query)
        characters = char_result.scalars().all()

        # Format book detail response
        book_detail = self._format_book_detail(book)
        book_detail["characters"] = [
            self._format_character(char) for char in characters
        ]

        # Add uploader info if user uploaded
        if book.source == "user_upload" and book.uploader_id:
            # Would need to join with user table here
            book_detail["uploader"] = {
                "id": str(book.uploader_id),
                "nickname": "User",  # Would fetch from user table
            }

        return book_detail

    async def get_book_characters(self, book_id: str) -> List[Dict[str, Any]]:
        """Get list of available dialogue characters for a book"""
        # Verify book exists and is published
        book_query = select(Book).where(
            Book.id == book_id, Book.status == BookStatus.PUBLISHED
        )
        book_result = await self.db.execute(book_query)
        book = book_result.scalar_one_or_none()

        if not book:
            raise NotFoundException("Book not found")

        # Get active characters
        char_query = (
            select(BookCharacter)
            .where(BookCharacter.book_id == book.id, BookCharacter.enabled == True)
            .order_by(BookCharacter.dialogue_count.desc())
        )
        result = await self.db.execute(char_query)
        characters = result.scalars().all()

        return {"characters": [self._format_character(char) for char in characters]}

    async def get_popular_books(
        self, period: str = "week", limit: int = 10
    ) -> Dict[str, Any]:
        """Get list of most popular books based on dialogue count"""
        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:  # all
            start_date = None

        # Base query for published books
        query = select(Book).where(Book.status == BookStatus.PUBLISHED)

        # If period specified, join with dialogue sessions to count recent dialogues
        if start_date:
            # Subquery to count dialogues in period
            dialogue_subquery = (
                select(
                    DialogueSession.book_id,
                    func.count(DialogueSession.id).label("recent_count"),
                )
                .where(DialogueSession.created_at >= start_date)
                .group_by(DialogueSession.book_id)
                .subquery()
            )

            # Join and order by recent dialogue count
            query = (
                query.outerjoin(dialogue_subquery, Book.id == dialogue_subquery.c.book_id)
                .order_by(
                    func.coalesce(dialogue_subquery.c.recent_count, 0).desc(),
                    Book.dialogue_count.desc(),
                )
            )
        else:
            # Order by total dialogue count
            query = query.order_by(desc(Book.dialogue_count))

        # Apply limit
        query = query.limit(limit)

        # Execute query
        result = await self.db.execute(query)
        books = result.scalars().all()

        return {
            "period": period,
            "books": [self._format_book(book) for book in books],
            "count": len(books),
        }

    # Helper methods
    def _format_book(self, book: Book) -> Dict[str, Any]:
        """Format basic book response"""
        return {
            "id": str(book.id),
            "title": book.title,
            "author": book.author,
            "cover": book.cover_url,
            "category": book.category,
            "description": book.description,
            "dialogue_count": book.dialogue_count or 0,
            "rating": float(book.rating or 0),
            "created_at": book.created_at.isoformat() if book.created_at else None,
        }

    def _format_book_detail(self, book: Book) -> Dict[str, Any]:
        """Format detailed book response"""
        base = self._format_book(book)
        base.update(
            {
                "type": book.type.value if book.type else "ai_known",
                "chapters": book.chapters,
                "estimated_reading_time": book.estimated_reading_time,
                "characters": [],  # Will be filled separately
                "tags": book.tags if hasattr(book, "tags") and book.tags else [],
                "uploader": None,  # Will be filled if applicable
            }
        )
        return base

    def _format_character(self, character: BookCharacter) -> Dict[str, Any]:
        """Format character response"""
        return {
            "id": str(character.id),
            "name": character.name,
            "alias": character.alias or [],
            "description": character.description or "",
            "personality": character.personality,
            "dialogue_count": character.dialogue_count or 0,
            "enabled": character.enabled,
        }