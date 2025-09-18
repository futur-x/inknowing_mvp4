"""
FastAPI dependencies for authentication and authorization
"""
from typing import Optional
from fastapi import Depends, HTTPException, status, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config.database import get_db
from core.security import verify_token
from models.user import User


# Security scheme
security = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token

    Args:
        request: FastAPI request object
        credentials: Optional Bearer token credentials
        db: Database session

    Returns:
        Current user object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    # First, try to get token from cookie
    token = request.cookies.get("access_token")

    # If no cookie, try to get from Authorization header
    if not token and credentials:
        token = credentials.credentials

    # If still no token, raise authentication error
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(token, token_type="access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is suspended or banned",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user

    Args:
        current_user: Current user from token

    Returns:
        Active user object

    Raises:
        HTTPException: If user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


async def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current premium (paid) user

    Args:
        current_user: Current active user

    Returns:
        Premium user object

    Raises:
        HTTPException: If user doesn't have premium membership
    """
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium membership required",
        )

    if not current_user.membership_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Membership has expired",
        )

    return current_user


async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise

    Args:
        request: FastAPI request object
        credentials: Optional bearer token
        db: Database session

    Returns:
        User object if authenticated, None otherwise
    """
    # First, try to get token from cookie
    token = request.cookies.get("access_token")

    # If no cookie, try to get from Authorization header
    if not token and credentials:
        token = credentials.credentials

    # If no token at all, return None
    if not token:
        return None
    payload = verify_token(token, token_type="access")

    if not payload:
        return None

    user_id: str = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    return user


class RateLimitDependency:
    """
    Rate limiting dependency based on user membership
    """

    def __init__(self, resource_type: str = "dialogue"):
        self.resource_type = resource_type

    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        """
        Check rate limit for user

        Args:
            current_user: Current user
            db: Database session

        Returns:
            User if within rate limit

        Raises:
            HTTPException: If rate limit exceeded
        """
        # TODO: Implement actual rate limiting logic
        # This would check user quotas in the database
        # For now, just return the user
        return current_user


# Create rate limiter instances for different resources
rate_limit_dialogue = RateLimitDependency("dialogue")
rate_limit_upload = RateLimitDependency("upload")


async def get_admin_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> "Admin":
    """Get current admin user (placeholder implementation)"""
    # This is a simplified implementation - should verify admin role
    current_user = await get_current_user(request, credentials, db)

    # For now, treat any user as admin for development
    # In production, check admin role from admin table
    from models.admin import Admin

    # Create a mock admin object based on current user
    admin = Admin(
        id=current_user.id,
        username=current_user.username or "admin",
        email=getattr(current_user, 'email', None),
        role="admin",  # Default role
        is_active=True
    )
    return admin