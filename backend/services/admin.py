"""
Admin management service
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

from sqlalchemy import func, and_, or_, text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from backend.models.admin import (
    Admin, AuditLog, AuditActionType, SystemConfig, AIModelConfig
)
from backend.models.user import User, MembershipType, UserStatus
from backend.models.book import Book, BookStatus, BookType
from backend.models.upload import Upload, UploadStatus
from backend.models.dialogue import DialogueSession
from backend.core.logger import logger


class AdminService:
    """Admin management service"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # Dashboard Methods
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get dashboard statistics

        Returns:
            Dashboard stats including real-time metrics, today's stats, and trending data
        """
        try:
            now = datetime.utcnow()
            today_start = datetime(now.year, now.month, now.day)

            # Real-time stats
            stmt = select(func.count(User.id)).where(
                User.last_login_at > now - timedelta(minutes=5)
            )
            result = await self.db.execute(stmt)
            online_users = result.scalar() or 0

            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.status == "active",
                DialogueSession.last_message_at > now - timedelta(minutes=30)
            )
            result = await self.db.execute(stmt)
            active_dialogues = result.scalar() or 0

            # Today's stats
            stmt = select(func.count(User.id)).where(User.created_at >= today_start)
            result = await self.db.execute(stmt)
            new_users = result.scalar() or 0

            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.created_at >= today_start
            )
            result = await self.db.execute(stmt)
            total_dialogues = result.scalar() or 0

            stmt = select(func.count(Book.id)).where(Book.created_at >= today_start)
            result = await self.db.execute(stmt)
            new_books = result.scalar() or 0

            # API cost (simplified - should be calculated from actual usage logs)
            stmt = text("""
                SELECT COALESCE(SUM(tokens_used * 0.00001), 0) as cost
                FROM dialogue_messages
                WHERE created_at >= :today_start
            """)
            result = await self.db.execute(stmt, {"today_start": today_start})
            api_cost = result.scalar() or 0.0

            # Revenue (from payments)
            stmt = text("""
                SELECT COALESCE(SUM(amount), 0) as revenue
                FROM payments
                WHERE status = 'completed' AND created_at >= :today_start
            """)
            result = await self.db.execute(stmt, {"today_start": today_start})
            revenue = result.scalar() or 0.0

            # Trending books
            stmt = text("""
                SELECT b.id, b.title, COUNT(ds.id) as dialogue_count
                FROM books b
                JOIN dialogue_sessions ds ON b.id = ds.book_id
                WHERE ds.created_at >= :week_ago
                GROUP BY b.id, b.title
                ORDER BY dialogue_count DESC
                LIMIT 5
            """)
            result = await self.db.execute(
                stmt,
                {"week_ago": now - timedelta(days=7)}
            )
            top_books = [
                {
                    "book_id": row.id,
                    "title": row.title,
                    "dialogue_count": row.dialogue_count
                }
                for row in result
            ]

            return {
                "real_time": {
                    "online_users": online_users,
                    "active_dialogues": active_dialogues,
                    "api_health": {
                        "main": {"status": "healthy", "latency": 45},
                        "backup": {"status": "healthy", "latency": 62}
                    }
                },
                "today": {
                    "new_users": new_users,
                    "total_dialogues": total_dialogues,
                    "new_books": new_books,
                    "api_cost": api_cost,
                    "revenue": revenue
                },
                "trending": {
                    "top_books": top_books,
                    "top_questions": []  # To be implemented with search analytics
                }
            }

        except Exception as e:
            logger.error(f"Dashboard stats error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get dashboard stats"
            )

    # User Management Methods
    async def list_users(
        self,
        search: Optional[str] = None,
        membership: Optional[MembershipType] = None,
        status: Optional[str] = None,
        role: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        registered_from: Optional[datetime] = None,
        registered_to: Optional[datetime] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        List users with filters

        Args:
            search: Search query for username, phone, email
            membership: Filter by membership type
            status: Filter by user status
            role: Filter by user role
            sort_by: Sort field (created_at, last_active, username, dialogue_count)
            sort_order: Sort order (asc, desc)
            registered_from: Filter by registration date from
            registered_to: Filter by registration date to
            page: Page number
            limit: Items per page

        Returns:
            Paginated user list
        """
        try:
            # Build query
            stmt = select(User)

            # Apply filters
            conditions = []
            if search:
                conditions.append(
                    or_(
                        User.username.contains(search),
                        User.phone.contains(search),
                        User.nickname.contains(search),
                        User.email.contains(search) if hasattr(User, 'email') else False
                    )
                )
            if membership:
                conditions.append(User.membership == membership)
            if status and status != "all":
                if status == "active":
                    conditions.append(User.status == UserStatus.ACTIVE)
                elif status == "suspended":
                    conditions.append(User.status == UserStatus.SUSPENDED)
                elif status == "banned":
                    conditions.append(User.status == UserStatus.BANNED)

            # Date range filters
            if registered_from:
                conditions.append(User.created_at >= registered_from)
            if registered_to:
                conditions.append(User.created_at <= registered_to)

            if conditions:
                stmt = stmt.where(and_(*conditions))

            # Count total
            count_stmt = select(func.count()).select_from(User)
            if conditions:
                count_stmt = count_stmt.where(and_(*conditions))
            result = await self.db.execute(count_stmt)
            total = result.scalar() or 0

            # Apply sorting
            order_field = None
            if sort_by == "created_at":
                order_field = User.created_at
            elif sort_by == "last_active":
                order_field = User.last_login_at
            elif sort_by == "username":
                order_field = User.username
            # Add dialogue_count sorting later with subquery

            if order_field:
                if sort_order == "desc":
                    stmt = stmt.order_by(order_field.desc())
                else:
                    stmt = stmt.order_by(order_field.asc())
            else:
                stmt = stmt.order_by(User.created_at.desc())

            # Apply pagination
            offset = (page - 1) * limit
            stmt = stmt.offset(offset).limit(limit)

            # Execute query
            result = await self.db.execute(stmt)
            users = result.scalars().all()

            # Get additional stats for each user
            user_list = []
            for user in users:
                # Get dialogue count
                stmt = select(func.count(DialogueSession.id)).where(
                    DialogueSession.user_id == user.id
                )
                result = await self.db.execute(stmt)
                dialogue_count = result.scalar() or 0

                # Get upload count
                stmt = select(func.count(Upload.id)).where(Upload.user_id == user.id)
                result = await self.db.execute(stmt)
                upload_count = result.scalar() or 0

                user_dict = user.dict()
                user_dict.update({
                    "total_dialogues": dialogue_count,
                    "total_uploads": upload_count,
                    "last_active": user.last_login_at.isoformat() if user.last_login_at else None
                })
                user_list.append(user_dict)

            return {
                "users": user_list,
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
            logger.error(f"List users error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list users"
            )

    async def get_user_details(self, user_id: str) -> Dict[str, Any]:
        """
        Get detailed user information

        Args:
            user_id: User ID

        Returns:
            User details with stats
        """
        try:
            # Get user
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Get stats
            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.user_id == user_id
            )
            result = await self.db.execute(stmt)
            dialogue_count = result.scalar() or 0

            stmt = select(func.count(Upload.id)).where(Upload.user_id == user_id)
            result = await self.db.execute(stmt)
            upload_count = result.scalar() or 0

            # Get quota usage
            user_dict = user.dict()
            user_dict.update({
                "total_dialogues": dialogue_count,
                "total_uploads": upload_count,
                "quota_used": user.quota_used if hasattr(user, 'quota_used') else 0,
                "quota_limit": self._get_quota_limit(user.membership)
            })

            return user_dict

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get user details error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get user details"
            )

    async def update_user(
        self,
        admin: Admin,
        user_id: str,
        status: Optional[UserStatus] = None,
        membership: Optional[MembershipType] = None,
        quota_override: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update user by admin

        Args:
            admin: Admin performing the action
            user_id: User ID to update
            status: New user status
            membership: New membership type
            quota_override: Override quota limit

        Returns:
            Updated user details
        """
        try:
            # Get user
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            old_values = {}
            new_values = {}

            # Update status
            if status and status != user.status:
                old_values["status"] = user.status
                user.status = status
                new_values["status"] = status

            # Update membership
            if membership and membership != user.membership:
                old_values["membership"] = user.membership
                user.membership = membership
                new_values["membership"] = membership

            # Update quota override
            if quota_override is not None:
                if hasattr(user, 'quota_override'):
                    old_values["quota_override"] = user.quota_override
                    user.quota_override = quota_override
                    new_values["quota_override"] = quota_override

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.USER_UPDATE,
                entity_type="user",
                entity_id=user_id,
                description=f"Updated user {user.username}",
                old_values=old_values,
                new_values=new_values
            )

            await self.db.commit()
            await self.db.refresh(user)

            return await self.get_user_details(user_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Update user error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )

    # Book Management Methods
    async def list_books(
        self,
        status: Optional[str] = None,
        type: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        List books with filters

        Args:
            status: Filter by book status
            type: Filter by book type
            page: Page number
            limit: Items per page

        Returns:
            Paginated book list
        """
        try:
            # Build query
            stmt = select(Book)

            # Apply filters
            conditions = []
            if status and status != "all":
                if status == "published":
                    conditions.append(Book.status == "published")
                elif status == "draft":
                    conditions.append(Book.status == "draft")
                elif status == "review":
                    conditions.append(Book.status == "review")

            if type and type != "all":
                if type == "ai_known":
                    conditions.append(Book.type == "ai_known")
                elif type == "vectorized":
                    conditions.append(Book.type == "vectorized")

            if conditions:
                stmt = stmt.where(and_(*conditions))

            # Count total
            count_stmt = select(func.count()).select_from(Book)
            if conditions:
                count_stmt = count_stmt.where(and_(*conditions))
            result = await self.db.execute(count_stmt)
            total = result.scalar() or 0

            # Apply pagination
            offset = (page - 1) * limit
            stmt = stmt.offset(offset).limit(limit).order_by(Book.created_at.desc())

            # Execute query
            result = await self.db.execute(stmt)
            books = result.scalars().all()

            # Add additional info
            book_list = []
            for book in books:
                book_dict = book.dict()

                # Get dialogue count
                stmt = select(func.count(DialogueSession.id)).where(
                    DialogueSession.book_id == book.id
                )
                result = await self.db.execute(stmt)
                dialogue_count = result.scalar() or 0

                book_dict.update({
                    "dialogue_count": dialogue_count,
                    "review_status": book.review_status if hasattr(book, 'review_status') else None
                })
                book_list.append(book_dict)

            return {
                "books": book_list,
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
            logger.error(f"List books error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list books"
            )

    async def create_book(
        self,
        admin: Admin,
        title: str,
        author: str,
        type: BookType,
        category: Optional[str] = None,
        description: Optional[str] = None,
        cover_url: Optional[str] = None,
        isbn: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Book:
        """
        Create a new book

        Args:
            admin: Admin creating the book
            title: Book title
            author: Book author
            type: Book type (ai_known or needs_upload)
            category: Book category
            description: Book description
            cover_url: Cover image URL
            isbn: ISBN
            tags: Book tags

        Returns:
            Created book
        """
        try:
            # Check if book exists
            stmt = select(Book).where(
                Book.title == title,
                Book.author == author
            )
            result = await self.db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Book already exists"
                )

            # Create book
            book = Book(
                id=str(uuid4()),
                title=title,
                author=author,
                type=type,
                category=category,
                description=description,
                cover_url=cover_url,
                isbn=isbn,
                tags=tags or [],
                status="draft",
                created_by=admin.id,
                source="admin"
            )

            self.db.add(book)

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.BOOK_CREATE,
                entity_type="book",
                entity_id=book.id,
                description=f"Created book: {title} by {author}",
                new_values=book.dict()
            )

            await self.db.commit()
            await self.db.refresh(book)

            return book

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create book"
            )

    async def review_book(
        self,
        admin: Admin,
        book_id: str,
        action: str,
        reason: Optional[str] = None,
        vectorize: bool = True
    ) -> Book:
        """
        Review uploaded book

        Args:
            admin: Admin reviewing the book
            book_id: Book ID
            action: approve, reject, or request_changes
            reason: Reason for rejection or changes
            vectorize: Whether to vectorize (for non-AI-known books)

        Returns:
            Updated book
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

            old_status = book.status

            # Update based on action
            if action == "approve":
                book.status = "published"
                if hasattr(book, 'review_status'):
                    book.review_status = "approved"
                if hasattr(book, 'reviewer_id'):
                    book.reviewer_id = admin.id

                # Trigger vectorization if needed
                if vectorize and book.type == "vectorized":
                    # This would trigger the vectorization workflow
                    pass

            elif action == "reject":
                book.status = "draft"  # Set to draft since rejected is not in enum
                if hasattr(book, 'review_status'):
                    book.review_status = "rejected"
                if hasattr(book, 'reviewer_id'):
                    book.reviewer_id = admin.id
                if hasattr(book, 'review_notes'):
                    book.review_notes = reason

            elif action == "request_changes":
                if hasattr(book, 'review_status'):
                    book.review_status = "changes_requested"
                if hasattr(book, 'reviewer_id'):
                    book.reviewer_id = admin.id
                if hasattr(book, 'review_notes'):
                    book.review_notes = reason

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.CONTENT_REVIEW,
                entity_type="book",
                entity_id=book_id,
                description=f"Reviewed book: {action}",
                old_values={"status": old_status},
                new_values={"status": book.status, "action": action, "reason": reason}
            )

            await self.db.commit()
            await self.db.refresh(book)

            return book

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Review book error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to review book"
            )

    async def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics"""
        try:
            # Total users
            stmt = select(func.count(User.id))
            result = await self.db.execute(stmt)
            total_users = result.scalar() or 0

            # Users by membership
            stmt = select(
                User.membership,
                func.count(User.id)
            ).group_by(User.membership)
            result = await self.db.execute(stmt)
            membership_stats = {row[0]: row[1] for row in result}

            # Active users (last 30 days)
            active_since = datetime.utcnow() - timedelta(days=30)
            stmt = select(func.count(User.id)).where(
                User.last_login_at >= active_since
            )
            result = await self.db.execute(stmt)
            active_users = result.scalar() or 0

            return {
                "total_users": total_users,
                "active_users": active_users,
                "membership_breakdown": membership_stats
            }

        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return {"total_users": 0, "active_users": 0, "membership_breakdown": {}}

    async def get_book_stats(self) -> Dict[str, Any]:
        """Get book statistics"""
        try:
            # Total books
            stmt = select(func.count(Book.id))
            result = await self.db.execute(stmt)
            total_books = result.scalar() or 0

            # Active books
            stmt = select(func.count(Book.id)).where(Book.status == "published")
            result = await self.db.execute(stmt)
            active_books = result.scalar() or 0

            # Books by category
            stmt = select(
                Book.category,
                func.count(Book.id)
            ).where(Book.category.isnot(None)).group_by(Book.category)
            result = await self.db.execute(stmt)
            category_stats = {row[0]: row[1] for row in result}

            return {
                "total_books": total_books,
                "active_books": active_books,
                "category_breakdown": category_stats
            }

        except Exception as e:
            logger.error(f"Error getting book stats: {e}")
            return {"total_books": 0, "active_books": 0, "category_breakdown": {}}

    async def get_dialogue_stats_summary(self) -> Dict[str, Any]:
        """Get dialogue statistics summary"""
        try:
            # Total dialogues
            stmt = select(func.count(DialogueSession.id))
            result = await self.db.execute(stmt)
            total_dialogues = result.scalar() or 0

            # Active dialogues
            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.status == "active"
            )
            result = await self.db.execute(stmt)
            active_dialogues = result.scalar() or 0

            # Average messages per dialogue
            stmt = text("""
                SELECT AVG(message_count)
                FROM (
                    SELECT session_id, COUNT(*) as message_count
                    FROM dialogue_messages
                    GROUP BY session_id
                ) as counts
            """)
            result = await self.db.execute(stmt)
            avg_messages = result.scalar() or 0

            return {
                "total_dialogues": total_dialogues,
                "active_dialogues": active_dialogues,
                "avg_messages_per_dialogue": round(avg_messages, 2)
            }

        except Exception as e:
            logger.error(f"Error getting dialogue stats: {e}")
            return {
                "total_dialogues": 0,
                "active_dialogues": 0,
                "avg_messages_per_dialogue": 0
            }

    # AI Model Management Methods
    async def get_model_config(self) -> Dict[str, Any]:
        """
        Get AI model configuration

        Returns:
            Current AI model configuration
        """
        try:
            # Get all model configs
            stmt = select(AIModelConfig).order_by(AIModelConfig.is_primary.desc())
            result = await self.db.execute(stmt)
            models = result.scalars().all()

            primary_model = None
            backup_models = []

            for model in models:
                model_dict = {
                    "id": model.id,
                    "provider": model.provider,
                    "model": model.model,
                    "api_endpoint": model.api_endpoint,
                    "api_key_configured": bool(model.api_key_encrypted),
                    "parameters": model.parameters,
                    "monthly_cost": model.current_month_cost,
                    "status": model.status,
                    "last_health_check": model.last_health_check.isoformat() if model.last_health_check else None,
                    "average_latency": model.average_latency_ms
                }

                if model.is_primary:
                    primary_model = model_dict
                elif model.is_backup:
                    backup_models.append(model_dict)

            # Get routing rules from system config
            stmt = select(SystemConfig).where(SystemConfig.key == "ai_routing_rules")
            result = await self.db.execute(stmt)
            routing_config = result.scalar_one_or_none()

            return {
                "primary_model": primary_model,
                "backup_models": backup_models,
                "routing_rules": routing_config.value if routing_config else {},
                "embedding_model": {
                    "provider": "openai",
                    "model": "text-embedding-ada-002",
                    "dimension": 1536
                }
            }

        except Exception as e:
            logger.error(f"Get model config error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get model configuration"
            )

    # Statistics Methods
    async def get_cost_statistics(
        self,
        period: str = "month",
        group_by: str = "model"
    ) -> Dict[str, Any]:
        """
        Get cost statistics

        Args:
            period: Time period (today, week, month, year)
            group_by: Group by (model, feature, user_tier)

        Returns:
            Cost statistics
        """
        try:
            now = datetime.utcnow()

            # Calculate period start
            if period == "today":
                period_start = datetime(now.year, now.month, now.day)
            elif period == "week":
                period_start = now - timedelta(days=7)
            elif period == "month":
                period_start = now - timedelta(days=30)
            elif period == "year":
                period_start = now - timedelta(days=365)
            else:
                period_start = now - timedelta(days=30)

            # Get cost data (simplified - should query from actual usage logs)
            total_cost = 150.0  # Mock data

            breakdown = []
            if group_by == "model":
                breakdown = [
                    {"category": "GPT-4", "cost": 100.0, "percentage": 66.7, "count": 1000},
                    {"category": "Claude", "cost": 50.0, "percentage": 33.3, "count": 500}
                ]

            # Trend data
            trend = [
                {"date": (now - timedelta(days=i)).strftime("%Y-%m-%d"), "cost": 5.0 + i * 0.5}
                for i in range(7, 0, -1)
            ]

            return {
                "period": period,
                "total_cost": total_cost,
                "breakdown": breakdown,
                "trend": trend,
                "projection": {
                    "estimated_monthly": total_cost * 30 / 7,
                    "budget_status": "on_track"
                }
            }

        except Exception as e:
            logger.error(f"Get cost statistics error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get cost statistics"
            )

    async def get_dialogue_statistics(
        self,
        period: str = "month",
        group_by: str = "book"
    ) -> Dict[str, Any]:
        """
        Get dialogue statistics

        Args:
            period: Time period
            group_by: Group by (book, user, model, type)

        Returns:
            Dialogue statistics
        """
        try:
            now = datetime.utcnow()

            # Calculate period start
            if period == "today":
                period_start = datetime(now.year, now.month, now.day)
            elif period == "week":
                period_start = now - timedelta(days=7)
            elif period == "month":
                period_start = now - timedelta(days=30)
            elif period == "year":
                period_start = now - timedelta(days=365)
            else:
                period_start = now - timedelta(days=30)

            # Get total dialogues
            stmt = select(func.count(DialogueSession.id)).where(
                DialogueSession.created_at >= period_start
            )
            result = await self.db.execute(stmt)
            total_dialogues = result.scalar() or 0

            # Get unique users
            stmt = select(func.count(func.distinct(DialogueSession.user_id))).where(
                DialogueSession.created_at >= period_start
            )
            result = await self.db.execute(stmt)
            unique_users = result.scalar() or 0

            # Mock breakdown data
            breakdown = [
                {"category": "Book Dialogue", "count": int(total_dialogues * 0.7), "average_messages": 10, "average_duration": 300},
                {"category": "Character Dialogue", "count": int(total_dialogues * 0.3), "average_messages": 15, "average_duration": 450}
            ]

            return {
                "period": period,
                "total_dialogues": total_dialogues,
                "unique_users": unique_users,
                "breakdown": breakdown,
                "satisfaction": {
                    "average_rating": 4.5,
                    "feedback_count": 100
                }
            }

        except Exception as e:
            logger.error(f"Get dialogue statistics error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get dialogue statistics"
            )

    # Helper Methods
    def _get_quota_limit(self, membership: MembershipType) -> int:
        """Get quota limit based on membership type"""
        limits = {
            MembershipType.FREE: 20,
            MembershipType.BASIC: 200,
            MembershipType.PREMIUM: 500,
            MembershipType.SUPER: 1000
        }
        return limits.get(membership, 20)

    async def _create_audit_log(
        self,
        admin_id: str,
        action: AuditActionType,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        description: str = "",
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ):
        """Create audit log entry"""
        audit_log = AuditLog(
            admin_id=admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            old_values=old_values,
            new_values=new_values,
            success=True
        )
        self.db.add(audit_log)

    async def delete_user(self, admin: Admin, user_id: str):
        """Delete user account"""
        try:
            # Get user
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.USER_DELETE,
                entity_type="user",
                entity_id=user_id,
                description=f"Deleted user {user.username}"
            )

            # Delete user
            await self.db.delete(user)
            await self.db.commit()

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Delete user error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )

    async def change_user_status(
        self, admin: Admin, user_id: str, new_status: UserStatus,
        reason: str = "", duration: Optional[int] = None
    ):
        """Change user status"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            old_status = user.status
            user.status = new_status

            # If temporary suspension, set expiry
            if duration and new_status == UserStatus.SUSPENDED:
                if hasattr(user, 'suspension_expires'):
                    user.suspension_expires = datetime.utcnow() + timedelta(days=duration)

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.USER_STATUS_CHANGE,
                entity_type="user",
                entity_id=user_id,
                description=f"Changed user {user.username} status from {old_status} to {new_status}. Reason: {reason}",
                old_values={"status": str(old_status)},
                new_values={"status": str(new_status), "reason": reason}
            )

            await self.db.commit()
            await self.db.refresh(user)

            return await self.get_user_details(user_id)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Change user status error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change user status"
            )

    async def reset_user_password(self, admin: Admin, user_id: str):
        """Reset user password"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Generate temporary password
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            temp_password = ''.join(secrets.choice(alphabet) for i in range(12))

            # Hash and set new password
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            user.password_hash = pwd_context.hash(temp_password)

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.PASSWORD_RESET,
                entity_type="user",
                entity_id=user_id,
                description=f"Reset password for user {user.username}"
            )

            await self.db.commit()

            # Return temporary password (should be sent via email in production)
            return {
                "message": "Password reset successfully",
                "temporary_password": temp_password,
                "user_id": user_id
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Reset password error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset password"
            )

    async def get_user_activities(
        self, user_id: str, activity_type: Optional[str] = None, limit: int = 50
    ):
        """Get user activity history"""
        try:
            activities = []

            # Get dialogue sessions
            if not activity_type or activity_type == "dialogues":
                stmt = select(DialogueSession).where(
                    DialogueSession.user_id == user_id
                ).order_by(DialogueSession.created_at.desc()).limit(limit)
                result = await self.db.execute(stmt)
                sessions = result.scalars().all()

                for session in sessions:
                    activities.append({
                        "type": "dialogue",
                        "timestamp": session.created_at.isoformat(),
                        "details": {
                            "session_id": str(session.id),
                            "book_id": str(session.book_id),
                            "duration": session.duration if hasattr(session, 'duration') else None
                        }
                    })

            # Get uploads
            if not activity_type or activity_type == "uploads":
                stmt = select(Upload).where(
                    Upload.user_id == user_id
                ).order_by(Upload.created_at.desc()).limit(limit)
                result = await self.db.execute(stmt)
                uploads = result.scalars().all()

                for upload in uploads:
                    activities.append({
                        "type": "upload",
                        "timestamp": upload.created_at.isoformat(),
                        "details": {
                            "upload_id": str(upload.id),
                            "filename": upload.filename,
                            "status": upload.status
                        }
                    })

            # Sort by timestamp
            activities.sort(key=lambda x: x["timestamp"], reverse=True)

            return {
                "activities": activities[:limit],
                "total": len(activities)
            }

        except Exception as e:
            logger.error(f"Get user activities error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get user activities"
            )

    async def batch_user_operation(
        self, admin: Admin, user_ids: List[str], operation: str, params: Dict[str, Any]
    ):
        """Perform batch operations on multiple users"""
        try:
            successful = []
            failed = []

            for user_id in user_ids:
                try:
                    if operation == "suspend":
                        await self.change_user_status(
                            admin, user_id, UserStatus.SUSPENDED,
                            params.get("reason", "Batch suspension"),
                            params.get("duration")
                        )
                        successful.append(user_id)
                    elif operation == "ban":
                        await self.change_user_status(
                            admin, user_id, UserStatus.BANNED,
                            params.get("reason", "Batch ban")
                        )
                        successful.append(user_id)
                    elif operation == "delete":
                        await self.delete_user(admin, user_id)
                        successful.append(user_id)
                    elif operation == "change_membership":
                        await self.update_user(
                            admin, user_id,
                            membership=MembershipType(params.get("membership"))
                        )
                        successful.append(user_id)
                    else:
                        failed.append({"user_id": user_id, "error": "Unknown operation"})
                except Exception as e:
                    failed.append({"user_id": user_id, "error": str(e)})

            return {
                "successful": successful,
                "failed": failed,
                "total": len(user_ids),
                "success_count": len(successful),
                "failure_count": len(failed)
            }

        except Exception as e:
            logger.error(f"Batch operation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to perform batch operation"
            )

    async def export_users(self, admin: Admin, format: str, filters: Dict[str, Any]):
        """Export user data"""
        try:
            # Get users with filters
            users_data = await self.list_users(**filters, limit=10000)
            users = users_data["users"]

            # Create export file
            import csv
            import io
            import os

            if format == "csv":
                output = io.StringIO()
                writer = csv.DictWriter(output, fieldnames=[
                    "id", "username", "phone", "email", "membership",
                    "status", "created_at", "last_active", "total_dialogues"
                ])
                writer.writeheader()
                writer.writerows(users)

                # Save to file
                filename = f"users_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
                filepath = f"/tmp/{filename}"
                with open(filepath, 'w') as f:
                    f.write(output.getvalue())

                # Create audit log
                await self._create_audit_log(
                    admin_id=admin.id,
                    action=AuditActionType.DATA_EXPORT,
                    description=f"Exported {len(users)} users to {format}"
                )

                return filepath

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported export format"
                )

        except Exception as e:
            logger.error(f"Export users error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to export users"
            )

    async def get_user_points(self, user_id: str):
        """Get user points/credits information"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Get points balance (simplified - should query actual points table)
            return {
                "user_id": user_id,
                "balance": getattr(user, 'points_balance', 0),
                "total_earned": getattr(user, 'points_earned', 0),
                "total_spent": getattr(user, 'points_spent', 0),
                "last_transaction": None
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get user points error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get user points"
            )

    async def adjust_user_points(
        self, admin: Admin, user_id: str, amount: int, operation: str, reason: str
    ):
        """Adjust user points balance"""
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            old_balance = getattr(user, 'points_balance', 0)

            if operation == "add":
                new_balance = old_balance + amount
            elif operation == "set":
                new_balance = amount
            else:
                new_balance = max(0, old_balance - amount)

            # Update balance (simplified - should create transaction record)
            if hasattr(user, 'points_balance'):
                user.points_balance = new_balance

            # Create audit log
            await self._create_audit_log(
                admin_id=admin.id,
                action=AuditActionType.POINTS_ADJUSTMENT,
                entity_type="user",
                entity_id=user_id,
                description=f"Adjusted points for user {user.username}: {reason}",
                old_values={"balance": old_balance},
                new_values={"balance": new_balance, "adjustment": amount}
            )

            await self.db.commit()

            return {
                "user_id": user_id,
                "old_balance": old_balance,
                "new_balance": new_balance,
                "adjustment": amount,
                "reason": reason
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Adjust user points error: {e}")
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to adjust user points"
            )