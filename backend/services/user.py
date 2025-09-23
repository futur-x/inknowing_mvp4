"""
User service layer for business logic
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from decimal import Decimal
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func

from backend.models.user import User, UserProfile, UserQuota, MembershipType, UserStatus
from backend.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
)


class UserService:
    """Service class for user-related business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_profile(self, user_id: UUID) -> User:
        """Get user profile by ID"""
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundException("User not found")

        return user

    async def update_user_profile(
        self, user_id: UUID, nickname: Optional[str] = None, avatar: Optional[str] = None
    ) -> User:
        """Update user profile information"""
        user = await self.get_user_profile(user_id)

        if nickname is not None:
            user.nickname = nickname
        if avatar is not None:
            user.avatar = avatar

        user.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def get_user_quota(self, user_id: UUID) -> Dict[str, Any]:
        """Get user dialogue quota status"""
        user = await self.get_user_profile(user_id)

        # Return mock quota data for now (table doesn't exist yet)
        # Define quota limits by membership
        quota_limits = {
            "free": 20,  # 20 per day
            "basic": 200,  # 200 per month
            "premium": 500,  # 500 per month
            "super": 1000,  # 1000 per month
        }

        # Get membership value as string
        membership_str = user.membership.value if hasattr(user.membership, 'value') else str(user.membership)
        total_quota = quota_limits.get(membership_str, 20)

        # Calculate reset date
        if membership_str == "free":
            # Daily reset for free users
            tomorrow = datetime.utcnow() + timedelta(days=1)
            reset_at = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # Monthly reset for paid users
            now = datetime.utcnow()
            if now.month == 12:
                reset_at = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                reset_at = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

        return {
            "total": total_quota,
            "used": 0,  # Mock: no dialogues used yet
            "remaining": total_quota,
            "reset_at": reset_at,
        }

    async def get_user_membership(self, user_id: UUID) -> Dict[str, Any]:
        """Get user membership details"""
        user = await self.get_user_profile(user_id)
        quota_info = await self.get_user_quota(user_id)

        # Get membership value as string
        membership_str = user.membership.value if hasattr(user.membership, 'value') else str(user.membership)

        # Define membership benefits
        benefits = self._get_membership_benefits(membership_str)

        return {
            "type": membership_str,
            "expires_at": user.membership_expires_at,
            "quota_total": quota_info["total"],
            "quota_used": quota_info["used"],
            "quota_reset_at": quota_info["reset_at"],
            "benefits": benefits,
        }

    async def upgrade_membership(
        self,
        user_id: UUID,
        plan: str,
        duration: int = 1,
        payment_method: str = "wechat",
    ) -> Dict[str, Any]:
        """Initiate membership upgrade"""
        user = await self.get_user_profile(user_id)

        # Validate plan
        try:
            target_membership = MembershipType(plan)
        except ValueError:
            raise BadRequestException(f"Invalid membership plan: {plan}")

        # Check if already on this plan
        if user.membership == target_membership and user.membership_active:
            raise BadRequestException("Already on selected membership plan")

        # Calculate price
        price = self._calculate_membership_price(target_membership, duration)

        # Create payment order (mock for now)
        order_id = uuid.uuid4().hex
        payment_order = {
            "order_id": order_id,
            "user_id": str(user_id),
            "type": "membership",
            "plan": plan,
            "duration": duration,
            "amount": float(price),
            "currency": "CNY",
            "status": "pending",
            "payment_method": payment_method,
            "payment_url": f"https://payment.example.com/pay/{order_id}",
            "expires_at": (datetime.utcnow() + timedelta(minutes=30)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
        }

        return payment_order

    async def get_dialogue_history(
        self,
        user_id: UUID,
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Get user's dialogue history"""
        # Verify user exists
        await self.get_user_profile(user_id)

        # For now, return mock data
        return {
            "sessions": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False,
            },
        }

    async def delete_user_account(self, user_id: UUID) -> None:
        """Delete user account (soft delete)"""
        user = await self.get_user_profile(user_id)

        # Soft delete - mark as deleted
        user.deleted_at = datetime.utcnow()
        user.status = UserStatus.BANNED

        await self.db.commit()

    # Private helper methods
    async def _create_quota_period(self, user: User) -> UserQuota:
        """Create a new quota period for user based on membership"""
        # Define quota limits by membership
        quota_limits = {
            MembershipType.FREE: (20, "daily"),  # 20 per day
            MembershipType.BASIC: (200, "monthly"),  # 200 per month
            MembershipType.PREMIUM: (500, "monthly"),  # 500 per month
            MembershipType.SUPER: (1000, "monthly"),  # 1000 per month
        }

        total_quota, period_type = quota_limits.get(user.membership, (20, "daily"))

        # Calculate period dates
        if period_type == "daily":
            period_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=1)
        else:  # monthly
            period_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            # Calculate next month
            if period_start.month == 12:
                period_end = period_start.replace(year=period_start.year + 1, month=1)
            else:
                period_end = period_start.replace(month=period_start.month + 1)

        # Create quota record
        quota = UserQuota(
            user_id=user.id,
            quota_type="dialogue",
            total_quota=total_quota,
            used_quota=0,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.db.add(quota)
        await self.db.commit()
        await self.db.refresh(quota)

        return quota

    def _get_membership_benefits(self, membership: str) -> List[str]:
        """Get benefits for a membership type"""
        benefits = {
            "free": [
                "20 dialogues per day",
                "Access to book dialogues",
                "Basic search features",
            ],
            "basic": [
                "200 dialogues per month",
                "Access to book and character dialogues",
                "Advanced search features",
                "Save dialogue history",
            ],
            "premium": [
                "500 dialogues per month",
                "All Basic features",
                "Upload up to 3 books",
                "Priority response time",
                "Export dialogue history",
            ],
            "super": [
                "1000 dialogues per month",
                "All Premium features",
                "Upload up to 10 books",
                "Priority support",
                "Early access to new features",
                "Custom AI models",
            ],
        }
        return benefits.get(membership, [])

    def _calculate_membership_price(
        self, membership: MembershipType, duration: int
    ) -> Decimal:
        """Calculate membership price"""
        # Monthly prices
        monthly_prices = {
            MembershipType.FREE: Decimal("0"),
            MembershipType.BASIC: Decimal("29.9"),
            MembershipType.PREMIUM: Decimal("59.9"),
            MembershipType.SUPER: Decimal("99.9"),
        }

        monthly_price = monthly_prices.get(membership, Decimal("0"))

        # Apply discounts for longer durations
        if duration >= 12:
            # Annual discount: 20% off
            return monthly_price * duration * Decimal("0.8")
        elif duration >= 6:
            # Semi-annual discount: 10% off
            return monthly_price * duration * Decimal("0.9")
        else:
            return monthly_price * duration


# Utility function for quota checking
async def check_user_quota(db: AsyncSession, user_id: UUID) -> bool:
    """
    Check if user has remaining quota for dialogues

    Args:
        db: Database session
        user_id: User ID

    Returns:
        True if user has quota, False otherwise
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user:
        return False

    # Get current quota
    result = await db.execute(
        select(UserQuota).where(
            UserQuota.user_id == user_id,
            UserQuota.quota_type == "dialogue",
            UserQuota.period_end > datetime.utcnow(),
        )
    )
    quota = result.scalar_one_or_none()

    if not quota:
        # No quota period found, create one and return True
        return True

    # Check if user has remaining quota
    return quota.used_quota < quota.total_quota
