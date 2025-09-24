"""
Admin API endpoints
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func, desc

from backend.config.database import get_db
from backend.models.admin import Admin, AdminRole
from backend.models.user import User, MembershipType
from backend.models.book import Book
from backend.models.dialogue import DialogueSession
from backend.services.admin_auth import AdminAuthService
from backend.services.auth import AuthService
from backend.services.admin import AdminService
from backend.services.monitoring import MonitoringService
from backend.services.book_admin import BookAdminService
from backend.schemas.admin import (
    # Auth
    AdminLogin,
    AdminAuthResponse,
    AdminTokenRefresh,
    AdminPasswordChange,
    # Dashboard
    DashboardStats,
    CostStatistics,
    DialogueStatistics,
    SystemAlert,
    # User Management
    AdminUserResponse,
    AdminUserUpdate,
    UserListResponse,
    # Book Management
    AdminBookCreate,
    AdminBookUpdate,
    AdminBookResponse,
    BookListResponse,
    BookReviewRequest,
    # Character Management
    AdminCharacterCreate,
    AdminCharacterUpdate,
    AdminCharacterResponse,
    # AI Model
    ModelConfig,
    ModelConfigUpdate,
    ModelTestRequest,
    ModelTestResult,
    AICheckRequest,
    AICheckResult,
    # Audit Log
    AuditLogResponse,
    AuditLogListResponse,
)
from backend.schemas.monitoring import (
    EnhancedDashboardStats,
    EnhancedCostStatistics,
    EnhancedDialogueStatistics,
    SystemAlertCreate,
    SystemAlertUpdate,
    SystemAlertResponse,
    AlertsListResponse,
    SystemHealthResponse,
)
from backend.models.user import MembershipType
from backend.core.logger import logger

router = APIRouter(prefix="/admin", tags=["Admin"])

# Security
security = HTTPBearer()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get current admin from token - supports both admin and super membership users"""
    token = credentials.credentials

    # First try admin authentication
    admin_auth_service = AdminAuthService(db)
    try:
        admin = await admin_auth_service.get_current_admin(token)
        if admin:
            return admin
    except:
        pass

    # If not admin, try regular user with super membership
    from backend.core.security import verify_token
    try:
        # Verify the user token
        payload = verify_token(token, token_type="access")
        if payload:
            user_id = payload.get("sub")
            if user_id:
                # Get user from database
                result = await db.execute(
                    select(User).where(User.id == user_id, User.deleted_at.is_(None))
                )
                user = result.scalar_one_or_none()

                if user and user.membership == MembershipType.SUPER:
                    # Return user as admin-like object
                    return user
    except:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_permission(permission: str):
    """Dependency to check admin permission"""
    async def check_permission(
        admin = Depends(get_current_admin)
    ):
        # If it's a User with super membership, allow all permissions
        if hasattr(admin, 'membership') and admin.membership == MembershipType.SUPER:
            return admin
        # If it's an Admin, check permissions normally
        if hasattr(admin, 'has_permission') and not admin.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        return admin
    return check_permission


def require_super_admin():
    """Dependency to require super admin role"""
    async def check_super_admin(
        admin = Depends(get_current_admin)
    ):
        # If it's a User with super membership, allow access
        if hasattr(admin, 'membership') and admin.membership == MembershipType.SUPER:
            return admin
        # If it's an Admin, check role
        if hasattr(admin, 'role') and admin.role != AdminRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required"
            )
        return admin
    return check_super_admin


# ==================== Authentication Endpoints ====================
@router.post("/login", response_model=AdminAuthResponse)
async def admin_login(
    request: Request,
    login_data: AdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """Admin login endpoint"""
    auth_service = AdminAuthService(db)

    # Get client info for audit
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    # Authenticate admin
    admin = await auth_service.authenticate_admin(
        username=login_data.username,
        password=login_data.password,
        ip_address=ip_address,
        user_agent=user_agent
    )

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Create tokens
    tokens = await auth_service.create_admin_tokens(
        admin=admin,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return AdminAuthResponse(**tokens)


@router.post("/refresh", response_model=AdminAuthResponse)
async def refresh_token(
    request: Request,
    refresh_data: AdminTokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """Refresh admin access token"""
    auth_service = AdminAuthService(db)

    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    # Refresh token
    tokens = await auth_service.refresh_admin_token(
        refresh_token=refresh_data.refresh_token,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return AdminAuthResponse(**tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def admin_logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin logout"""
    auth_service = AdminAuthService(db)

    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")

    # Logout
    await auth_service.logout_admin(
        token=credentials.credentials,
        admin=admin,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return None


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    password_data: AdminPasswordChange,
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Change admin password"""
    auth_service = AdminAuthService(db)

    success = await auth_service.change_admin_password(
        admin=admin,
        old_password=password_data.old_password,
        new_password=password_data.new_password
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to change password"
        )

    return None


# ==================== Dashboard Endpoints ====================
@router.get("/dashboard", response_model=EnhancedDashboardStats)
async def get_dashboard(
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get enhanced dashboard statistics"""
    monitoring_service = MonitoringService(db)

    # Get real-time, today's stats, and trending data
    real_time = await monitoring_service.get_real_time_metrics()
    today = await monitoring_service.get_today_stats()
    trending = await monitoring_service.get_trending_data()

    return {
        "real_time": real_time,
        "today": today,
        "trending": trending
    }


@router.get("/stats", response_model=Dict[str, Any])
async def get_admin_stats(
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive admin statistics for dashboard"""
    monitoring_service = MonitoringService(db)
    admin_service = AdminService(db)

    # Get various statistics
    user_stats = await admin_service.get_user_stats()
    book_stats = await admin_service.get_book_stats()
    dialogue_stats = await admin_service.get_dialogue_stats_summary()

    # Get today's metrics
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())

    # Get new users today
    stmt = select(func.count(User.id)).where(
        User.created_at >= today_start
    )
    result = await db.execute(stmt)
    new_users_today = result.scalar() or 0

    # Get dialogues today
    stmt = select(func.count(DialogueSession.id)).where(
        DialogueSession.created_at >= today_start
    )
    result = await db.execute(stmt)
    dialogues_today = result.scalar() or 0

    # Get active users (using created_at as a proxy for now)
    active_since = datetime.utcnow() - timedelta(hours=24)
    stmt = select(func.count(User.id)).where(
        User.created_at >= active_since
    )
    result = await db.execute(stmt)
    active_users = result.scalar() or 0

    return {
        "total_users": user_stats.get("total_users", 0),
        "total_books": book_stats.get("total_books", 0),
        "today_dialogues": dialogues_today,
        "active_users": active_users,
        "new_users_today": new_users_today,
        "total_dialogues": dialogue_stats.get("total_dialogues", 0),
        "user_stats": user_stats,
        "book_stats": book_stats,
        "dialogue_stats": dialogue_stats
    }


@router.get("/trends", response_model=Dict[str, Any])
async def get_trends_data(
    period: int = 7,  # days
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get trend data for charts"""
    monitoring_service = MonitoringService(db)

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period)

    # Get user growth trend
    user_trend = await monitoring_service.get_user_growth_trend(start_date, end_date)

    # Get dialogue trend
    dialogue_trend = await monitoring_service.get_dialogue_trend(start_date, end_date)

    # Get book category distribution
    book_distribution = await monitoring_service.get_book_category_distribution()

    # Get user activity heatmap data
    activity_heatmap = await monitoring_service.get_user_activity_heatmap(period)

    return {
        "user_growth": user_trend,
        "dialogue_trend": dialogue_trend,
        "book_distribution": book_distribution,
        "activity_heatmap": activity_heatmap,
        "period_days": period
    }


@router.get("/recent-activities", response_model=Dict[str, Any])
async def get_recent_activities(
    limit: int = 10,
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get recent system activities"""
    monitoring_service = MonitoringService(db)

    # Get recent users
    stmt = select(User).order_by(desc(User.created_at)).limit(limit)
    result = await db.execute(stmt)
    recent_users = result.scalars().all()

    # Get recent dialogues
    stmt = (
        select(DialogueSession, User, Book)
        .join(User, DialogueSession.user_id == User.id)
        .join(Book, DialogueSession.book_id == Book.id)
        .order_by(desc(DialogueSession.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    recent_dialogues = [
        {
            "id": str(row[0].id),
            "user": row[1].username,
            "book": row[2].title,
            "created_at": row[0].created_at.isoformat(),
            "status": row[0].status
        }
        for row in result.all()
    ]

    # Get popular books
    stmt = (
        select(Book, func.count(DialogueSession.id).label("dialogue_count"))
        .join(DialogueSession, Book.id == DialogueSession.book_id, isouter=True)
        .group_by(Book.id)
        .order_by(desc("dialogue_count"))
        .limit(limit)
    )
    result = await db.execute(stmt)
    popular_books = [
        {
            "id": str(row[0].id),
            "title": row[0].title,
            "author": row[0].author,
            "dialogue_count": row[1] or 0,
            "rating": row[0].rating
        }
        for row in result.all()
    ]

    # Get system announcements (if any)
    announcements = await monitoring_service.get_system_announcements(limit=5)

    return {
        "recent_users": [
            {
                "id": str(u.id),
                "username": u.username,
                "created_at": u.created_at.isoformat(),
                "membership": u.membership
            }
            for u in recent_users
        ],
        "recent_dialogues": recent_dialogues,
        "popular_books": popular_books,
        "announcements": announcements
    }


@router.get("/statistics/costs", response_model=EnhancedCostStatistics)
async def get_cost_statistics(
    period: str = "month",
    group_by: str = "model",
    admin: Admin = Depends(require_permission("statistics:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get enhanced cost statistics"""
    monitoring_service = MonitoringService(db)
    return await monitoring_service.get_enhanced_cost_statistics(
        period=period,
        group_by=group_by
    )


@router.get("/statistics/dialogues", response_model=DialogueStatistics)
async def get_dialogue_statistics(
    period: str = "month",
    group_by: str = "book",
    admin: Admin = Depends(require_permission("statistics:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get dialogue statistics"""
    service = AdminService(db)
    return await service.get_dialogue_statistics(period=period, group_by=group_by)


@router.get("/monitoring/alerts", response_model=AlertsListResponse)
async def get_system_alerts(
    severity: Optional[str] = None,
    status: str = "active",
    limit: int = 50,
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system alerts"""
    from models.monitoring import AlertSeverity, AlertType, AlertStatus

    monitoring_service = MonitoringService(db)

    # Convert string parameters to enums
    severity_enum = None
    if severity:
        try:
            severity_enum = AlertSeverity(severity)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity: {severity}"
            )

    status_enum = AlertStatus(status) if status else AlertStatus.ACTIVE

    alerts = await monitoring_service.get_alerts(
        severity=severity_enum,
        status=status_enum,
        limit=limit
    )

    return {"alerts": alerts}


# ==================== User Management Endpoints ====================
@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = None,
    membership: Optional[MembershipType] = None,
    status: Optional[str] = "all",
    role: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    registered_from: Optional[datetime] = None,
    registered_to: Optional[datetime] = None,
    page: int = 1,
    limit: int = 50,
    admin: Admin = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db)
):
    """List users with advanced filters"""
    service = AdminService(db)
    return await service.list_users(
        search=search,
        membership=membership,
        status=status,
        role=role,
        sort_by=sort_by,
        sort_order=sort_order,
        registered_from=registered_from,
        registered_to=registered_to,
        page=page,
        limit=limit
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_details(
    user_id: str,
    admin: Admin = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information"""
    service = AdminService(db)
    return await service.get_user_details(user_id)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: str,
    update_data: AdminUserUpdate,
    admin: Admin = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db)
):
    """Update user by admin"""
    service = AdminService(db)
    return await service.update_user(
        admin=admin,
        user_id=user_id,
        status=update_data.status,
        membership=update_data.membership,
        quota_override=update_data.quota_override
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin: Admin = Depends(require_permission("users:delete")),
    db: AsyncSession = Depends(get_db)
):
    """Delete user account"""
    service = AdminService(db)
    await service.delete_user(admin=admin, user_id=user_id)
    return None


@router.post("/users/{user_id}/status", response_model=AdminUserResponse)
async def change_user_status(
    user_id: str,
    status_data: Dict[str, str],
    admin: Admin = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db)
):
    """Change user status (active, suspended, banned)"""
    service = AdminService(db)
    new_status = UserStatus(status_data.get("status"))
    reason = status_data.get("reason", "")
    duration = status_data.get("duration")  # For temporary suspension

    return await service.change_user_status(
        admin=admin,
        user_id=user_id,
        new_status=new_status,
        reason=reason,
        duration=duration
    )


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_user_password(
    user_id: str,
    admin: Admin = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db)
):
    """Reset user password and send notification"""
    service = AdminService(db)
    result = await service.reset_user_password(
        admin=admin,
        user_id=user_id
    )
    return result


@router.get("/users/{user_id}/activities", response_model=Dict[str, Any])
async def get_user_activities(
    user_id: str,
    activity_type: Optional[str] = None,
    limit: int = 50,
    admin: Admin = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity history"""
    service = AdminService(db)
    return await service.get_user_activities(
        user_id=user_id,
        activity_type=activity_type,
        limit=limit
    )


@router.post("/users/batch", response_model=Dict[str, Any])
async def batch_user_operation(
    operation_data: Dict[str, Any],
    admin: Admin = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db)
):
    """Perform batch operations on multiple users"""
    service = AdminService(db)

    user_ids = operation_data.get("user_ids", [])
    operation = operation_data.get("operation")  # suspend, ban, delete, change_membership
    params = operation_data.get("params", {})

    return await service.batch_user_operation(
        admin=admin,
        user_ids=user_ids,
        operation=operation,
        params=params
    )


@router.get("/users/export", response_model=Dict[str, str])
async def export_users(
    format: str = "csv",  # csv or excel
    filters: Optional[str] = None,
    admin: Admin = Depends(require_permission("users:export")),
    db: AsyncSession = Depends(get_db)
):
    """Export user data to CSV or Excel"""
    service = AdminService(db)

    # Parse filters if provided
    filter_dict = {}
    if filters:
        import json
        filter_dict = json.loads(filters)

    file_path = await service.export_users(
        admin=admin,
        format=format,
        filters=filter_dict
    )

    return {"file_url": file_path}


@router.get("/users/{user_id}/points", response_model=Dict[str, Any])
async def get_user_points(
    user_id: str,
    admin: Admin = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get user points/credits information"""
    service = AdminService(db)
    return await service.get_user_points(user_id=user_id)


@router.post("/users/{user_id}/points", response_model=Dict[str, Any])
async def adjust_user_points(
    user_id: str,
    points_data: Dict[str, Any],
    admin: Admin = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db)
):
    """Adjust user points/credits balance"""
    service = AdminService(db)

    amount = points_data.get("amount", 0)
    reason = points_data.get("reason", "Admin adjustment")
    operation = points_data.get("operation", "add")  # add or set

    return await service.adjust_user_points(
        admin=admin,
        user_id=user_id,
        amount=amount,
        operation=operation,
        reason=reason
    )


# ==================== Book Management Endpoints ====================
@router.get("/books", response_model=BookListResponse)
async def list_books(
    search: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    ai_known: Optional[bool] = None,
    vector_status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20,
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """List all books with advanced filters"""
    book_service = BookAdminService(db)

    # Convert status string to enum if provided
    from models.book import BookStatus, BookType
    status_enum = None
    if status and status != "all":
        try:
            status_enum = BookStatus(status)
        except ValueError:
            pass

    type_enum = None
    if type and type != "all":
        try:
            type_enum = BookType(type)
        except ValueError:
            pass

    return await book_service.list_books_advanced(
        search=search,
        status=status_enum,
        type=type_enum,
        category=category,
        language=language,
        ai_known=ai_known,
        vector_status=vector_status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit
    )


@router.post("/books", response_model=AdminBookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_data: AdminBookCreate,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Create a new book"""
    service = AdminService(db)
    book = await service.create_book(
        admin=admin,
        title=book_data.title,
        author=book_data.author,
        type=book_data.type,
        category=book_data.category,
        description=book_data.description,
        cover_url=book_data.cover_url,
        isbn=book_data.isbn,
        tags=book_data.tags
    )
    return book


@router.get("/books/{book_id}", response_model=AdminBookResponse)
async def get_book_details(
    book_id: str,
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get book details"""
    book_service = BookAdminService(db)
    return await book_service.get_book_details(book_id)


@router.put("/books/{book_id}", response_model=AdminBookResponse)
async def update_book(
    book_id: str,
    update_data: AdminBookUpdate,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Update book"""
    book_service = BookAdminService(db)
    return await book_service.update_book(
        admin=admin,
        book_id=book_id,
        title=update_data.title,
        author=update_data.author,
        isbn=update_data.isbn,
        cover_url=update_data.cover_url,
        category=update_data.category,
        subcategory=update_data.subcategory,
        description=update_data.description,
        synopsis=update_data.synopsis,
        status=update_data.status,
        language=update_data.language,
        publish_year=update_data.publish_year,
        publisher=update_data.publisher,
        page_count=update_data.page_count,
        word_count=update_data.word_count,
        seo_keywords=update_data.seo_keywords
    )


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    admin: Admin = Depends(require_permission("books:delete")),
    db: AsyncSession = Depends(get_db)
):
    """Delete book"""
    book_service = BookAdminService(db)
    await book_service.delete_book(admin=admin, book_id=book_id)
    return None


@router.post("/books/{book_id}/approve", response_model=AdminBookResponse)
async def approve_book(
    book_id: str,
    vectorize: bool = True,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Approve a book for publication"""
    book_service = BookAdminService(db)
    return await book_service.approve_book(
        admin=admin,
        book_id=book_id,
        vectorize=vectorize
    )


@router.post("/books/{book_id}/reject", response_model=AdminBookResponse)
async def reject_book(
    book_id: str,
    reason: str,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Reject a book"""
    book_service = BookAdminService(db)
    return await book_service.reject_book(
        admin=admin,
        book_id=book_id,
        reason=reason
    )


@router.post("/books/{book_id}/vectorize", response_model=Dict[str, Any])
async def vectorize_book(
    book_id: str,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Start vectorization process for a book"""
    book_service = BookAdminService(db)
    return await book_service.vectorize_book(
        admin=admin,
        book_id=book_id
    )


@router.get("/books/stats", response_model=Dict[str, Any])
async def get_book_statistics(
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive book statistics"""
    book_service = BookAdminService(db)
    return await book_service.get_book_statistics()


@router.post("/books/batch", response_model=Dict[str, Any])
async def batch_book_operation(
    book_ids: List[str],
    action: str,
    params: Optional[Dict[str, Any]] = None,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Perform batch operations on multiple books"""
    book_service = BookAdminService(db)
    return await book_service.batch_update_books(
        admin=admin,
        book_ids=book_ids,
        action=action,
        params=params or {}
    )


@router.post("/books/{book_id}/review", response_model=AdminBookResponse)
async def review_book(
    book_id: str,
    review_data: BookReviewRequest,
    admin: Admin = Depends(require_permission("uploads:review")),
    db: AsyncSession = Depends(get_db)
):
    """Review uploaded book (legacy endpoint for compatibility)"""
    book_service = BookAdminService(db)
    if review_data.action == "approve":
        return await book_service.approve_book(
            admin=admin,
            book_id=book_id,
            vectorize=review_data.vectorize
        )
    elif review_data.action == "reject":
        return await book_service.reject_book(
            admin=admin,
            book_id=book_id,
            reason=review_data.reason or "Rejected by admin"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid review action"
        )


@router.post("/books/ai-check", response_model=AICheckResult)
async def check_ai_knowledge(
    check_data: AICheckRequest,
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """Check if AI knows about a book"""
    # This would integrate with AI service to check book knowledge
    return AICheckResult(
        ai_knows_book=False,
        confidence=0.0,
        detected_content={
            "chapters": [],
            "main_themes": [],
            "characters": []
        },
        recommendation="manual_review_needed"
    )


# ==================== Character Management Endpoints ====================
@router.get("/books/{book_id}/characters", response_model=List[AdminCharacterResponse])
async def list_book_characters(
    book_id: str,
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get book characters"""
    # Implementation would fetch characters
    return []


@router.post("/books/{book_id}/characters", response_model=AdminCharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    book_id: str,
    character_data: AdminCharacterCreate,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Add character to book"""
    # Implementation would create character
    raise HTTPException(status_code=501, detail="Not implemented")


@router.put("/books/{book_id}/characters/{character_id}", response_model=AdminCharacterResponse)
async def update_character(
    book_id: str,
    character_id: str,
    update_data: AdminCharacterUpdate,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Update character"""
    # Implementation would update character
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/books/{book_id}/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    book_id: str,
    character_id: str,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Delete character"""
    # Implementation would delete character
    raise HTTPException(status_code=501, detail="Not implemented")


# ==================== AI Model Management Endpoints ====================
@router.get("/models", response_model=ModelConfig)
async def get_model_config(
    admin: Admin = Depends(require_permission("config:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get AI model configuration"""
    service = AdminService(db)
    return await service.get_model_config()


@router.put("/models", response_model=ModelConfig)
async def update_model_config(
    config_data: ModelConfigUpdate,
    admin: Admin = Depends(require_super_admin()),
    db: AsyncSession = Depends(get_db)
):
    """Update AI model configuration"""
    # Implementation would update model config
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/models/test", response_model=ModelTestResult)
async def test_model(
    test_data: ModelTestRequest,
    admin: Admin = Depends(require_permission("config:write")),
    db: AsyncSession = Depends(get_db)
):
    """Test AI model connection"""
    # Implementation would test model
    return ModelTestResult(
        success=True,
        latency=150.0,
        response="Test successful",
        error=None,
        estimated_cost=0.001
    )


# ==================== Enhanced Monitoring Endpoints ====================
@router.post("/monitoring/alerts", response_model=SystemAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: SystemAlertCreate,
    admin: Admin = Depends(require_permission("monitoring:write")),
    db: AsyncSession = Depends(get_db)
):
    """Create a new system alert"""
    monitoring_service = MonitoringService(db)
    return await monitoring_service.create_alert(
        severity=alert_data.severity,
        type=alert_data.type,
        message=alert_data.message,
        details=alert_data.details,
        source=alert_data.source
    )


@router.patch("/monitoring/alerts/{alert_id}", response_model=SystemAlertResponse)
async def update_alert(
    alert_id: str,
    alert_update: SystemAlertUpdate,
    admin: Admin = Depends(require_permission("monitoring:write")),
    db: AsyncSession = Depends(get_db)
):
    """Update system alert status"""
    monitoring_service = MonitoringService(db)
    return await monitoring_service.update_alert_status(
        alert_id=alert_id,
        status=alert_update.status,
        admin_id=admin.id,
        resolution_notes=alert_update.resolution_notes
    )


@router.get("/monitoring/health", response_model=SystemHealthResponse)
async def get_system_health(
    admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get system health status"""
    monitoring_service = MonitoringService(db)
    api_health = await monitoring_service.get_api_health_status()

    # Determine overall status
    overall_status = "healthy"
    for service, health in api_health.items():
        if health["status"] == "down":
            overall_status = "down"
            break
        elif health["status"] == "degraded" and overall_status == "healthy":
            overall_status = "degraded"

    return {
        "overall_status": overall_status,
        "services": {
            service: {
                "status": health["status"],
                "latency": health["latency"],
                "error_rate": 0.0,  # Simplified
                "last_check": health["last_check"],
                "details": {"error_message": health.get("error_message")}
            }
            for service, health in api_health.items()
        },
        "timestamp": datetime.utcnow()
    }


# TODO: Implement record_metrics endpoint when MetricsCollectionRequest schema is available
# @router.post("/monitoring/metrics", status_code=status.HTTP_201_CREATED)
# async def record_metrics(
#     metrics_data: dict,  # MetricsCollectionRequest - TODO: Add schema
#     admin: Admin = Depends(require_permission("monitoring:write")),
#     db: AsyncSession = Depends(get_db)
# ):
#     """Record system metrics"""
#     monitoring_service = MonitoringService(db)
#
#     for metric_point in metrics_data.metrics:
#         await monitoring_service.record_metric(
#             metric_name=metric_point.metric_name,
#             value=metric_point.value,
#             tags=metric_point.tags,
#             source=metrics_data.source
#         )
#
#     return {"message": f"Recorded {len(metrics_data.metrics)} metrics successfully"}


@router.get("/statistics/dialogues", response_model=EnhancedDialogueStatistics)
async def get_enhanced_dialogue_statistics(
    period: str = "month",
    group_by: str = "book",
    admin: Admin = Depends(require_permission("statistics:read")),
    db: AsyncSession = Depends(get_db)
):
    """Get enhanced dialogue statistics"""
    # For now, fall back to the existing admin service implementation
    # This would be enhanced with the monitoring service
    admin_service = AdminService(db)
    return await admin_service.get_dialogue_statistics(period=period, group_by=group_by)