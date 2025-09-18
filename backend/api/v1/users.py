"""
User Management API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.dependencies import get_current_user
from models.user import User
from schemas.user import (
    UserProfile,
    UserUpdate,
    QuotaResponse,
    Membership,
    MembershipUpgrade,
    PaymentOrder,
    DialogueHistoryResponse,
)
from services.user import UserService

router = APIRouter(tags=["Users"])


@router.get("/profile", response_model=UserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user profile

    Returns:
        User profile information including membership status
    """
    service = UserService(db)
    user = await service.get_user_profile(current_user.id)

    return UserProfile(
        id=str(user.id),
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar,
        phone=user.phone,
        wechat_openid=user.wechat_openid,
        email=user.email,
        membership=user.membership.value if hasattr(user.membership, 'value') else str(user.membership),
        points=user.points,
        total_dialogues=user.total_dialogues,
        total_uploads=user.total_uploads,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.put("/profile", response_model=UserProfile)
async def update_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user profile

    Args:
        update_data: Fields to update (nickname, avatar)

    Returns:
        Updated user profile
    """
    service = UserService(db)
    user = await service.update_user_profile(
        current_user.id,
        nickname=update_data.nickname,
        avatar=update_data.avatar,
    )

    return UserProfile(
        id=str(user.id),
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar,
        phone=user.phone,
        wechat_openid=user.wechat_openid,
        email=user.email,
        membership=user.membership.value if hasattr(user.membership, 'value') else str(user.membership),
        points=user.points,
        total_dialogues=user.total_dialogues,
        total_uploads=user.total_uploads,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.patch("/profile", response_model=UserProfile)
async def patch_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user profile (PATCH method as per API spec)

    Args:
        update_data: Fields to update (nickname, avatar)

    Returns:
        Updated user profile
    """
    service = UserService(db)
    user = await service.update_user_profile(
        current_user.id,
        nickname=update_data.nickname,
        avatar=update_data.avatar,
    )

    return UserProfile(
        id=str(user.id),
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar,
        phone=user.phone,
        wechat_openid=user.wechat_openid,
        email=user.email,
        membership=user.membership.value if hasattr(user.membership, 'value') else str(user.membership),
        points=user.points,
        total_dialogues=user.total_dialogues,
        total_uploads=user.total_uploads,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/quota", response_model=QuotaResponse)
async def get_user_quota(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dialogue quota for current user

    Returns:
        Quota information including used, remaining, and reset time
    """
    service = UserService(db)
    quota_info = await service.get_user_quota(current_user.id)

    return QuotaResponse(
        total=quota_info["total"],
        used=quota_info["used"],
        remaining=quota_info["remaining"],
        reset_at=quota_info["reset_at"],
    )


@router.get("/membership", response_model=Membership)
async def get_membership_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get membership status and benefits

    Returns:
        Membership information including type, expiry, quota, and benefits
    """
    service = UserService(db)
    membership_info = await service.get_user_membership(current_user.id)

    return Membership(
        type=membership_info["type"],
        expires_at=membership_info["expires_at"],
        quota_total=membership_info["quota_total"],
        quota_used=membership_info["quota_used"],
        quota_reset_at=membership_info["quota_reset_at"],
        benefits=membership_info["benefits"],
    )


@router.post("/membership/upgrade", response_model=PaymentOrder)
async def upgrade_membership(
    upgrade_request: MembershipUpgrade,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade membership plan

    Business Logic: Free User → Paid Member State Transition

    Args:
        upgrade_request: Target plan, duration, and payment method

    Returns:
        Payment order for completing the upgrade

    Raises:
        400: Invalid plan or already on selected plan
    """
    service = UserService(db)

    try:
        payment_order = await service.upgrade_membership(
            current_user.id,
            plan=upgrade_request.plan,
            duration=upgrade_request.duration,
            payment_method=upgrade_request.payment_method.value,
        )

        return PaymentOrder(
            order_id=payment_order["order_id"],
            user_id=payment_order["user_id"],
            type=payment_order["type"],
            amount=payment_order["amount"],
            currency=payment_order["currency"],
            status=payment_order["status"],
            payment_method=payment_order["payment_method"],
            payment_url=payment_order["payment_url"],
            expires_at=payment_order["expires_at"],
            created_at=payment_order["created_at"],
        )
    except Exception as e:
        if "Invalid membership plan" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        elif "Already on selected membership plan" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        raise


@router.get("/history", response_model=DialogueHistoryResponse)
async def get_dialogue_history(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    book_id: Optional[str] = Query(None, description="Filter by book ID"),
    type: Optional[str] = Query(None, description="Filter by dialogue type (book/character)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user's dialogue history

    Args:
        page: Page number (default: 1)
        limit: Items per page (default: 20, max: 100)
        book_id: Optional filter by book ID
        type: Optional filter by dialogue type

    Returns:
        Paginated list of dialogue sessions
    """
    service = UserService(db)
    history = await service.get_dialogue_history(
        current_user.id,
        page=page,
        limit=limit,
    )

    return DialogueHistoryResponse(
        sessions=history["sessions"],
        pagination=history["pagination"],
    )


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user account

    This performs a soft delete by default, marking the account as deleted
    but preserving the data for audit purposes.

    Returns:
        204 No Content on successful deletion
    """
    service = UserService(db)
    await service.delete_user_account(current_user.id, hard_delete=False)

    # Return 204 No Content
    return None


# Additional convenience endpoints
@router.get("/membership/plans")
async def get_membership_plans():
    """
    Get available membership plans and pricing

    Returns:
        List of available membership plans with features and pricing
    """
    plans = {
        "free": {
            "name": "Free User",
            "monthly_price": 0,
            "annual_price": 0,
            "daily_quota": 20,
            "features": [
                "20 dialogues per day",
                "Access to book dialogues",
                "Basic search features"
            ]
        },
        "basic": {
            "name": "Basic Member",
            "monthly_price": 29.9,
            "annual_price": 299,
            "monthly_quota": 200,
            "features": [
                "200 dialogues per month",
                "Access to book and character dialogues",
                "Advanced search features",
                "Save dialogue history"
            ]
        },
        "premium": {
            "name": "Premium Member",
            "monthly_price": 59.9,
            "annual_price": 599,
            "monthly_quota": 500,
            "features": [
                "500 dialogues per month",
                "All Basic features",
                "Upload up to 3 books",
                "Priority response time",
                "Export dialogue history"
            ]
        },
        "super": {
            "name": "Super Member",
            "monthly_price": 99.9,
            "annual_price": 999,
            "monthly_quota": 1000,
            "features": [
                "1000 dialogues per month",
                "All Premium features",
                "Upload up to 10 books",
                "Priority support",
                "Early access to new features",
                "Custom AI models"
            ]
        }
    }

    return {"plans": plans}