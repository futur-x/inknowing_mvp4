"""
Admin API endpoints
"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel.ext.asyncio.session import AsyncSession

from config.database import get_db
from models.admin import Admin, AdminRole
from services.admin_auth import AdminAuthService
from services.admin import AdminService
from services.monitoring import MonitoringService
from schemas.admin import (
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
)
from schemas.monitoring import (
    EnhancedDashboardStats,
    EnhancedCostStatistics,
    EnhancedDialogueStatistics,
    SystemAlertCreate,
    SystemAlertUpdate,
    SystemAlertResponse,
    AlertsListResponse,
    SystemHealthResponse,
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
from models.user import MembershipType
from utils.logger import logger

router = APIRouter(prefix="/admin", tags=["Admin"])

# Security
security = HTTPBearer()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """Get current admin from token"""
    token = credentials.credentials
    auth_service = AdminAuthService(db)
    admin = await auth_service.get_current_admin(token)

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin


async def require_permission(permission: str):
    """Dependency to check admin permission"""
    async def check_permission(
        admin: Admin = Depends(get_current_admin)
    ) -> Admin:
        if not admin.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission}"
            )
        return admin
    return check_permission


async def require_super_admin():
    """Dependency to require super admin role"""
    async def check_super_admin(
        admin: Admin = Depends(get_current_admin)
    ) -> Admin:
        if admin.role != AdminRole.SUPER_ADMIN:
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
    admin: Admin = Depends(get_current_admin),
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
    admin: Admin = Depends(get_current_admin),
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
    admin: Admin = Depends(get_current_admin),
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
    admin: Admin = Depends(get_current_admin),
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
    page: int = 1,
    limit: int = 50,
    admin: Admin = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db)
):
    """List users with filters"""
    service = AdminService(db)
    return await service.list_users(
        search=search,
        membership=membership,
        status=status,
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


# ==================== Book Management Endpoints ====================
@router.get("/books", response_model=BookListResponse)
async def list_books(
    status: Optional[str] = "all",
    type: Optional[str] = "all",
    page: int = 1,
    limit: int = 50,
    admin: Admin = Depends(require_permission("books:read")),
    db: AsyncSession = Depends(get_db)
):
    """List all books with filters"""
    service = AdminService(db)
    return await service.list_books(
        status=status,
        type=type,
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
    # Implementation would fetch book details
    raise HTTPException(status_code=501, detail="Not implemented")


@router.put("/books/{book_id}", response_model=AdminBookResponse)
async def update_book(
    book_id: str,
    update_data: AdminBookUpdate,
    admin: Admin = Depends(require_permission("books:write")),
    db: AsyncSession = Depends(get_db)
):
    """Update book"""
    # Implementation would update book
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    admin: Admin = Depends(require_permission("books:delete")),
    db: AsyncSession = Depends(get_db)
):
    """Delete book"""
    # Implementation would delete book
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/books/{book_id}/review", response_model=AdminBookResponse)
async def review_book(
    book_id: str,
    review_data: BookReviewRequest,
    admin: Admin = Depends(require_permission("uploads:review")),
    db: AsyncSession = Depends(get_db)
):
    """Review uploaded book"""
    service = AdminService(db)
    return await service.review_book(
        admin=admin,
        book_id=book_id,
        action=review_data.action,
        reason=review_data.reason,
        vectorize=review_data.vectorize
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
    admin: Admin = Depends(get_current_admin),
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


@router.post("/monitoring/metrics", status_code=status.HTTP_201_CREATED)
async def record_metrics(
    metrics_data: MetricsCollectionRequest,
    admin: Admin = Depends(require_permission("monitoring:write")),
    db: AsyncSession = Depends(get_db)
):
    """Record system metrics"""
    monitoring_service = MonitoringService(db)

    for metric_point in metrics_data.metrics:
        await monitoring_service.record_metric(
            metric_name=metric_point.metric_name,
            value=metric_point.value,
            tags=metric_point.tags,
            source=metrics_data.source
        )

    return {"message": f"Recorded {len(metrics_data.metrics)} metrics successfully"}


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