"""
Search service layer for business logic
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.sql import text

from models.book import Book, BookStatus
from core.exceptions import BadRequestException


class SearchService:
    """Service class for search-related business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(
        self,
        query: str,
        search_type: str = "question",
        page: int = 1,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Search for books based on query and type

        Args:
            query: Search query string
            search_type: Type of search (question, title, author)
            page: Page number for pagination
            limit: Number of results per page

        Returns:
            Search results with pagination
        """
        if not query or not query.strip():
            raise BadRequestException("Search query cannot be empty")

        results = []
        total = 0

        if search_type == "question":
            # For question-based search, we would normally use vector search
            # For now, we'll do a simple text search in descriptions and titles
            results, total = await self._search_by_question(query, page, limit)
        elif search_type == "title":
            results, total = await self._search_by_title(query, page, limit)
        elif search_type == "author":
            results, total = await self._search_by_author(query, page, limit)
        else:
            raise BadRequestException(f"Invalid search type: {search_type}")

        return {
            "query": query,
            "type": search_type,
            "results": results,
            "total": total,
            "page": page,
            "limit": limit
        }

    async def search_books_by_title(
        self,
        title: str,
        exact: bool = False
    ) -> Dict[str, Any]:
        """
        Search books specifically by title

        Args:
            title: Book title to search
            exact: Whether to match exactly or use partial matching

        Returns:
            List of matching books
        """
        if not title or not title.strip():
            raise BadRequestException("Title cannot be empty")

        query = select(Book).where(Book.status == BookStatus.PUBLISHED)

        if exact:
            # Exact title match (case-insensitive)
            query = query.where(func.lower(Book.title) == func.lower(title))
        else:
            # Partial title match using ILIKE
            query = query.where(Book.title.ilike(f"%{title}%"))

        # Order by dialogue count (popularity)
        query = query.order_by(desc(Book.dialogue_count))

        result = await self.db.execute(query)
        books = result.scalars().all()

        return {
            "books": [self._format_book(book) for book in books],
            "pagination": {
                "page": 1,
                "limit": len(books),
                "total": len(books),
                "total_pages": 1,
                "has_next": False,
                "has_prev": False
            }
        }

    async def _search_by_question(
        self,
        query: str,
        page: int,
        limit: int
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Search books that can answer a question

        This would typically use vector search or AI to find relevant books.
        For now, we'll search in title, description, and synopsis.
        """
        # Build search query
        search_terms = query.lower().split()

        # Create OR conditions for each search term
        conditions = []
        for term in search_terms[:5]:  # Limit to first 5 terms
            conditions.extend([
                Book.title.ilike(f"%{term}%"),
                Book.description.ilike(f"%{term}%"),
                Book.synopsis.ilike(f"%{term}%")
            ])

        if not conditions:
            return [], 0

        # Base query for published books
        base_query = select(Book).where(
            and_(
                Book.status == BookStatus.PUBLISHED,
                or_(*conditions)
            )
        )

        # Count total results
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await self.db.scalar(count_query)

        # Get paginated results
        offset = (page - 1) * limit
        query = base_query.order_by(desc(Book.dialogue_count)).offset(offset).limit(limit)

        result = await self.db.execute(query)
        books = result.scalars().all()

        # Format results with relevance scores
        results = []
        for book in books:
            # Calculate a simple relevance score based on matches
            score = self._calculate_relevance_score(book, search_terms)
            results.append({
                "book": self._format_book(book),
                "relevance_score": score,
                "matched_chapters": []  # Would be populated with actual chapter matches
            })

        # Sort by relevance score
        results.sort(key=lambda x: x["relevance_score"], reverse=True)

        return results, total

    async def _search_by_title(
        self,
        query: str,
        page: int,
        limit: int
    ) -> tuple[List[Dict[str, Any]], int]:
        """Search books by title"""
        # Base query for published books
        base_query = select(Book).where(
            and_(
                Book.status == BookStatus.PUBLISHED,
                Book.title.ilike(f"%{query}%")
            )
        )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await self.db.scalar(count_query)

        # Get paginated results
        offset = (page - 1) * limit
        query = base_query.order_by(desc(Book.dialogue_count)).offset(offset).limit(limit)

        result = await self.db.execute(query)
        books = result.scalars().all()

        # Format results
        results = []
        for book in books:
            results.append({
                "book": self._format_book(book),
                "relevance_score": 100.0 if book.title.lower() == query.lower() else 80.0,
                "matched_chapters": []
            })

        return results, total

    async def _search_by_author(
        self,
        query: str,
        page: int,
        limit: int
    ) -> tuple[List[Dict[str, Any]], int]:
        """Search books by author"""
        # Base query for published books
        base_query = select(Book).where(
            and_(
                Book.status == BookStatus.PUBLISHED,
                Book.author.ilike(f"%{query}%")
            )
        )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await self.db.scalar(count_query)

        # Get paginated results
        offset = (page - 1) * limit
        query = base_query.order_by(desc(Book.dialogue_count)).offset(offset).limit(limit)

        result = await self.db.execute(query)
        books = result.scalars().all()

        # Format results
        results = []
        for book in books:
            results.append({
                "book": self._format_book(book),
                "relevance_score": 100.0 if book.author.lower() == query.lower() else 85.0,
                "matched_chapters": []
            })

        return results, total

    def _calculate_relevance_score(
        self,
        book: Book,
        search_terms: List[str]
    ) -> float:
        """
        Calculate a simple relevance score for a book based on search terms

        This is a simplified scoring algorithm. In production, you'd use
        more sophisticated methods like TF-IDF or vector similarity.
        """
        score = 0.0
        title_lower = (book.title or "").lower()
        desc_lower = (book.description or "").lower()
        synopsis_lower = (book.synopsis or "").lower()

        for term in search_terms:
            # Title matches are worth more
            if term in title_lower:
                score += 40.0
            # Description matches
            if term in desc_lower:
                score += 20.0
            # Synopsis matches
            if term in synopsis_lower:
                score += 10.0

        # Boost popular books slightly
        if book.dialogue_count > 100:
            score += 5.0
        elif book.dialogue_count > 50:
            score += 3.0

        # Cap at 100
        return min(score, 100.0)

    def _format_book(self, book: Book) -> Dict[str, Any]:
        """Format book for search results"""
        return {
            "id": str(book.id),
            "title": book.title,
            "author": book.author,
            "cover": book.cover_url,
            "category": book.category,
            "description": book.description,
            "dialogue_count": book.dialogue_count or 0,
            "rating": float(book.rating or 0),
            "created_at": book.created_at.isoformat() if book.created_at else None
        }