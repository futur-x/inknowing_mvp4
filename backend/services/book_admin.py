"""
Enhanced Book Administration Service
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
import json

from sqlalchemy import func, and_, or_, text, desc
from sqlalchemy.sql import Select
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from backend.models.book import Book, BookStatus, BookType, BookCharacter, BookChapter
from backend.models.admin import Admin, AuditLog, AuditActionType
from backend.models.user import User
from backend.models.upload import Upload, UploadStatus
from backend.models.dialogue import DialogueSession, DialogueMessage
from backend.core.logger import logger


class BookAdminService:
    """Enhanced book administration service"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_books_advanced(
        self,
        search: Optional[str] = None,
        status: Optional[BookStatus] = None,
        type: Optional[BookType] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        language: Optional[str] = None,
        ai_known: Optional[bool] = None,
        vector_status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        List books with advanced filtering and search
        """
        try:
            # Build base query
            stmt = select(Book)

            # Apply search filter
            if search:
                search_pattern = f"%{search}%"
                stmt = stmt.where(
                    or_(
                        Book.title.ilike(search_pattern),
                        Book.author.ilike(search_pattern),
                        Book.isbn.ilike(search_pattern),
                        Book.description.ilike(search_pattern)
                    )
                )

            # Apply filters
            if status:
                stmt = stmt.where(Book.status == status)

            if type:
                stmt = stmt.where(Book.type == type)

            if category:
                stmt = stmt.where(Book.category == category)

            if subcategory:
                stmt = stmt.where(Book.subcategory == subcategory)

            if language:
                stmt = stmt.where(Book.language == language)

            if ai_known is not None:
                stmt = stmt.where(Book.ai_known == ai_known)

            if vector_status:
                stmt = stmt.where(Book.vector_status == vector_status)

            # Count total before pagination
            count_stmt = select(func.count()).select_from(Book)
            # Apply same filters to count
            if search:
                count_stmt = count_stmt.where(
                    or_(
                        Book.title.ilike(search_pattern),
                        Book.author.ilike(search_pattern),
                        Book.isbn.ilike(search_pattern),
                        Book.description.ilike(search_pattern)
                    )
                )
            if status:
                count_stmt = count_stmt.where(Book.status == status)
            if type:
                count_stmt = count_stmt.where(Book.type == type)
            if category:
                count_stmt = count_stmt.where(Book.category == category)
            if subcategory:
                count_stmt = count_stmt.where(Book.subcategory == subcategory)
            if language:
                count_stmt = count_stmt.where(Book.language == language)
            if ai_known is not None:
                count_stmt = count_stmt.where(Book.ai_known == ai_known)
            if vector_status:
                count_stmt = count_stmt.where(Book.vector_status == vector_status)

            result = await self.db.execute(count_stmt)
            total = result.scalar() or 0

            # Apply sorting
            sort_column = getattr(Book, sort_by, Book.created_at)
            if sort_order == "desc":
                stmt = stmt.order_by(desc(sort_column))
            else:
                stmt = stmt.order_by(sort_column)

            # Apply pagination
            offset = (page - 1) * limit
            stmt = stmt.offset(offset).limit(limit)

            # Execute query
            result = await self.db.execute(stmt)
            books = result.scalars().all()

            # Enrich book data
            enriched_books = []
            for book in books:
                book_dict = {
                    "id": str(book.id),
                    "book_id": book.book_id,
                    "title": book.title,
                    "author": book.author,
                    "isbn": book.isbn,
                    "cover_url": book.cover_url,
                    "category": book.category,
                    "subcategory": book.subcategory,
                    "description": book.description,
                    "synopsis": book.synopsis,
                    "type": book.type,
                    "status": book.status,
                    "source": book.source,
                    "language": book.language,
                    "publish_year": book.publish_year,
                    "publisher": book.publisher,
                    "page_count": book.page_count,
                    "word_count": book.word_count,
                    "chapters": book.chapters,
                    "estimated_reading_time": book.estimated_reading_time,
                    "ai_known": book.ai_known,
                    "ai_model_tested": book.ai_model_tested,
                    "vector_status": book.vector_status,
                    "vector_count": book.vector_count,
                    "dialogue_count": book.dialogue_count,
                    "character_dialogue_count": book.character_dialogue_count,
                    "rating": float(book.rating) if book.rating else 0.0,
                    "rating_count": book.rating_count,
                    "view_count": book.view_count,
                    "favorite_count": book.favorite_count,
                    "share_count": book.share_count,
                    "total_api_cost": float(book.total_api_cost) if book.total_api_cost else 0.0,
                    "seo_keywords": book.seo_keywords,
                    "created_at": book.created_at.isoformat() if book.created_at else None,
                    "updated_at": book.updated_at.isoformat() if book.updated_at else None,
                }

                # Get character count
                char_stmt = select(func.count(BookCharacter.id)).where(
                    BookCharacter.book_id == book.id
                )
                char_result = await self.db.execute(char_stmt)
                book_dict["character_count"] = char_result.scalar() or 0

                enriched_books.append(book_dict)

            return {
                "books": enriched_books,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit,
                    "has_next": page * limit < total,
                    "has_prev": page > 1
                }
            }

        except Exception as e:
            logger.error(f"List books advanced error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list books"
            )

    async def get_book_details(self, book_id: str) -> Dict[str, Any]:
        """
        Get detailed book information including characters and chapters
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Convert to dict
            book_dict = {
                "id": str(book.id),
                "book_id": book.book_id,
                "title": book.title,
                "author": book.author,
                "isbn": book.isbn,
                "cover_url": book.cover_url,
                "category": book.category,
                "subcategory": book.subcategory,
                "description": book.description,
                "synopsis": book.synopsis,
                "type": book.type,
                "status": book.status,
                "source": book.source,
                "language": book.language,
                "original_language": book.original_language,
                "publish_year": book.publish_year,
                "publisher": book.publisher,
                "page_count": book.page_count,
                "word_count": book.word_count,
                "chapters": book.chapters,
                "estimated_reading_time": book.estimated_reading_time,
                "ai_known": book.ai_known,
                "ai_model_tested": book.ai_model_tested,
                "vector_status": book.vector_status,
                "vector_count": book.vector_count,
                "vector_model": book.vector_model,
                "vector_dimension": book.vector_dimension,
                "dialogue_count": book.dialogue_count,
                "character_dialogue_count": book.character_dialogue_count,
                "rating": float(book.rating) if book.rating else 0.0,
                "rating_count": book.rating_count,
                "view_count": book.view_count,
                "favorite_count": book.favorite_count,
                "share_count": book.share_count,
                "total_api_cost": float(book.total_api_cost) if book.total_api_cost else 0.0,
                "seo_keywords": book.seo_keywords,
                "uploader_id": str(book.uploader_id) if book.uploader_id else None,
                "created_at": book.created_at.isoformat() if book.created_at else None,
                "updated_at": book.updated_at.isoformat() if book.updated_at else None,
            }

            # Get characters
            char_stmt = select(BookCharacter).where(BookCharacter.book_id == book.id)
            char_result = await self.db.execute(char_stmt)
            characters = char_result.scalars().all()

            book_dict["characters"] = [
                {
                    "id": str(char.id),
                    "character_id": char.character_id,
                    "name": char.name,
                    "alias": char.alias,
                    "description": char.description,
                    "personality": char.personality,
                    "dialogue_count": char.dialogue_count,
                    "enabled": char.enabled
                }
                for char in characters
            ]

            # Get chapters
            chapter_stmt = select(BookChapter).where(
                BookChapter.book_id == book.id
            ).order_by(BookChapter.chapter_number)
            chapter_result = await self.db.execute(chapter_stmt)
            chapters = chapter_result.scalars().all()

            book_dict["chapters_list"] = [
                {
                    "id": str(chapter.id),
                    "chapter_number": chapter.chapter_number,
                    "title": chapter.title,
                    "word_count": chapter.word_count
                }
                for chapter in chapters
            ]

            # Get uploader info if exists
            if book.uploader_id:
                user_stmt = select(User).where(User.id == book.uploader_id)
                user_result = await self.db.execute(user_stmt)
                uploader = user_result.scalar_one_or_none()
                if uploader:
                    book_dict["uploader"] = {
                        "id": str(uploader.id),
                        "username": uploader.username,
                        "email": uploader.email
                    }

            return book_dict

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get book details error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get book details"
            )

    async def update_book(
        self,
        admin: Admin,
        book_id: str,
        title: Optional[str] = None,
        author: Optional[str] = None,
        isbn: Optional[str] = None,
        cover_url: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        description: Optional[str] = None,
        synopsis: Optional[str] = None,
        status: Optional[BookStatus] = None,
        language: Optional[str] = None,
        publish_year: Optional[int] = None,
        publisher: Optional[str] = None,
        page_count: Optional[int] = None,
        word_count: Optional[int] = None,
        seo_keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Update book information
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Store old values for audit
            old_values = {
                "title": book.title,
                "author": book.author,
                "status": book.status
            }

            # Update fields
            if title is not None:
                book.title = title
            if author is not None:
                book.author = author
            if isbn is not None:
                book.isbn = isbn
            if cover_url is not None:
                book.cover_url = cover_url
            if category is not None:
                book.category = category
            if subcategory is not None:
                book.subcategory = subcategory
            if description is not None:
                book.description = description
            if synopsis is not None:
                book.synopsis = synopsis
            if status is not None:
                book.status = status
            if language is not None:
                book.language = language
            if publish_year is not None:
                book.publish_year = publish_year
            if publisher is not None:
                book.publisher = publisher
            if page_count is not None:
                book.page_count = page_count
            if word_count is not None:
                book.word_count = word_count
            if seo_keywords is not None:
                book.seo_keywords = seo_keywords

            book.updated_at = datetime.utcnow()

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_UPDATE,
                entity_type="book",
                entity_id=book.id,
                description=f"Updated book: {book.title}",
                old_values=old_values,
                new_values={
                    "title": book.title,
                    "author": book.author,
                    "status": book.status
                }
            )

            await self.db.commit()
            await self.db.refresh(book)

            return await self.get_book_details(book_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update book"
            )

    async def delete_book(self, admin: Admin, book_id: str) -> None:
        """
        Delete a book (soft delete)
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Soft delete
            book.deleted_at = datetime.utcnow()
            book.status = BookStatus.offline

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_DELETE,
                entity_type="book",
                entity_id=book.id,
                description=f"Deleted book: {book.title}"
            )

            await self.db.commit()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete book"
            )

    async def approve_book(
        self,
        admin: Admin,
        book_id: str,
        vectorize: bool = True
    ) -> Dict[str, Any]:
        """
        Approve a book for publication
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Update status
            book.status = BookStatus.published
            book.updated_at = datetime.utcnow()

            # If vectorization is requested and book is not AI-known
            if vectorize and not book.ai_known:
                book.vector_status = "pending"
                # TODO: Trigger vectorization job

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_APPROVE,
                entity_type="book",
                entity_id=book.id,
                description=f"Approved book: {book.title}",
                new_values={"vectorize": vectorize}
            )

            await self.db.commit()
            await self.db.refresh(book)

            return await self.get_book_details(book_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Approve book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to approve book"
            )

    async def reject_book(
        self,
        admin: Admin,
        book_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reject a book
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Update status
            book.status = BookStatus.offline
            book.updated_at = datetime.utcnow()

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_REJECT,
                entity_type="book",
                entity_id=book.id,
                description=f"Rejected book: {book.title}",
                new_values={"reason": reason}
            )

            await self.db.commit()
            await self.db.refresh(book)

            return await self.get_book_details(book_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Reject book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reject book"
            )

    async def vectorize_book(
        self,
        admin: Admin,
        book_id: str
    ) -> Dict[str, Any]:
        """
        Start vectorization process for a book
        """
        try:
            # Get book
            stmt = select(Book).where(Book.id == book_id)
            result = await self.db.execute(stmt)
            book = result.scalar_one_or_none()

            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            if book.ai_known:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Book is already AI-known, vectorization not needed"
                )

            # Update vector status
            book.vector_status = "processing"
            book.updated_at = datetime.utcnow()

            # TODO: Trigger actual vectorization job
            # This would typically send a message to a queue or call an async service

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_VECTORIZE,
                entity_type="book",
                entity_id=book.id,
                description=f"Started vectorization for book: {book.title}"
            )

            await self.db.commit()
            await self.db.refresh(book)

            return {
                "id": str(book.id),
                "title": book.title,
                "vector_status": book.vector_status,
                "message": "Vectorization started"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Vectorize book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to start vectorization"
            )

    async def get_book_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive book statistics
        """
        try:
            now = datetime.utcnow()
            today_start = datetime(now.year, now.month, now.day)
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)

            # Total books by status
            status_stmt = select(
                Book.status,
                func.count(Book.id).label("count")
            ).group_by(Book.status)
            status_result = await self.db.execute(status_stmt)
            status_counts = {row[0]: row[1] for row in status_result}

            # Total books by type
            type_stmt = select(
                Book.type,
                func.count(Book.id).label("count")
            ).group_by(Book.type)
            type_result = await self.db.execute(type_stmt)
            type_counts = {row[0]: row[1] for row in type_result}

            # Books by category
            cat_stmt = select(
                Book.category,
                func.count(Book.id).label("count")
            ).group_by(Book.category).order_by(desc("count")).limit(10)
            cat_result = await self.db.execute(cat_stmt)
            category_distribution = [
                {"category": row[0], "count": row[1]}
                for row in cat_result
            ]

            # Top books by dialogues (all time)
            top_books_stmt = select(
                Book.id,
                Book.title,
                Book.author,
                Book.dialogue_count,
                Book.rating
            ).order_by(desc(Book.dialogue_count)).limit(10)
            top_result = await self.db.execute(top_books_stmt)
            top_books = [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "author": row[2],
                    "dialogue_count": row[3],
                    "rating": float(row[4]) if row[4] else 0.0
                }
                for row in top_result
            ]

            # Top books by rating
            rated_books_stmt = select(
                Book.id,
                Book.title,
                Book.author,
                Book.rating,
                Book.rating_count
            ).where(
                Book.rating_count > 0
            ).order_by(desc(Book.rating)).limit(10)
            rated_result = await self.db.execute(rated_books_stmt)
            top_rated_books = [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "author": row[2],
                    "rating": float(row[3]) if row[3] else 0.0,
                    "rating_count": row[4]
                }
                for row in rated_result
            ]

            # Vectorization stats
            vector_stmt = select(
                Book.vector_status,
                func.count(Book.id).label("count")
            ).where(
                Book.type == BookType.vectorized
            ).group_by(Book.vector_status)
            vector_result = await self.db.execute(vector_stmt)
            vector_stats = {row[0]: row[1] for row in vector_result}

            # Cost statistics
            cost_stmt = select(
                func.sum(Book.total_api_cost).label("total_cost"),
                func.avg(Book.total_api_cost).label("avg_cost")
            )
            cost_result = await self.db.execute(cost_stmt)
            cost_row = cost_result.one()

            return {
                "summary": {
                    "total_books": sum(status_counts.values()),
                    "published_books": status_counts.get(BookStatus.published, 0),
                    "draft_books": status_counts.get(BookStatus.draft, 0),
                    "review_books": status_counts.get(BookStatus.review, 0),
                    "ai_known_books": type_counts.get(BookType.ai_known, 0),
                    "vectorized_books": type_counts.get(BookType.vectorized, 0),
                },
                "category_distribution": category_distribution,
                "top_books_by_dialogues": top_books,
                "top_rated_books": top_rated_books,
                "vectorization": vector_stats,
                "costs": {
                    "total_api_cost": float(cost_row[0]) if cost_row[0] else 0.0,
                    "average_api_cost": float(cost_row[1]) if cost_row[1] else 0.0
                }
            }

        except Exception as e:
            logger.error(f"Get book statistics error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get book statistics"
            )

    async def batch_update_books(
        self,
        admin: Admin,
        book_ids: List[str],
        action: str,
        params: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform batch operations on multiple books
        """
        try:
            results = {
                "success": [],
                "failed": []
            }

            for book_id in book_ids:
                try:
                    if action == "approve":
                        await self.approve_book(admin, book_id, params.get("vectorize", True))
                        results["success"].append(book_id)
                    elif action == "reject":
                        await self.reject_book(admin, book_id, params.get("reason", "Batch rejection"))
                        results["success"].append(book_id)
                    elif action == "delete":
                        await self.delete_book(admin, book_id)
                        results["success"].append(book_id)
                    elif action == "vectorize":
                        await self.vectorize_book(admin, book_id)
                        results["success"].append(book_id)
                    elif action == "update_status":
                        # Get and update book
                        stmt = select(Book).where(Book.id == book_id)
                        result = await self.db.execute(stmt)
                        book = result.scalar_one_or_none()
                        if book:
                            book.status = params.get("status", book.status)
                            book.updated_at = datetime.utcnow()
                            results["success"].append(book_id)
                        else:
                            results["failed"].append({"id": book_id, "error": "Not found"})
                    else:
                        results["failed"].append({"id": book_id, "error": "Unknown action"})

                except Exception as e:
                    results["failed"].append({"id": book_id, "error": str(e)})

            # Commit all changes
            await self.db.commit()

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BATCH_OPERATION,
                entity_type="books",
                entity_id=",".join(book_ids),
                description=f"Batch {action} on {len(book_ids)} books",
                new_values=results
            )

            return results

        except Exception as e:
            logger.error(f"Batch update books error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to perform batch operation"
            )

    async def _create_audit_log(
        self,
        admin_id: str,
        action: AuditActionType,
        entity_type: str,
        entity_id: str,
        description: str,
        old_values: Dict[str, Any] = None,
        new_values: Dict[str, Any] = None
    ) -> None:
        """
        Create audit log entry
        """
        try:
            log = AuditLog(
                id=str(uuid4()),
                admin_id=admin_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                description=description,
                old_values=old_values,
                new_values=new_values,
                created_at=datetime.utcnow()
            )
            self.db.add(log)

        except Exception as e:
            logger.error(f"Create audit log error: {e}")
            # Don't raise, just log the error