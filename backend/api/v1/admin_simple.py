"""
Simplified admin authentication to allow super membership users
"""
from typing import Union
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from backend.config.database import get_db
from backend.models.admin import Admin
from backend.models.user import User, MembershipType
from backend.services.admin_auth import AdminAuthService
from backend.services.auth import AuthService

security = HTTPBearer()

async def get_current_admin_or_super_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Union[Admin, User]:
    """
    Get current admin or super membership user
    This allows both admin users and regular users with super membership to access admin APIs
    """
    token = credentials.credentials

    # First try to authenticate as admin
    admin_auth_service = AdminAuthService(db)
    try:
        admin = await admin_auth_service.get_current_admin(token)
        if admin:
            return admin
    except:
        pass

    # If not admin, try to authenticate as regular user with super membership
    auth_service = AuthService(db)
    try:
        user = await auth_service.get_current_user(token)
        if user and user.membership == MembershipType.SUPER:
            return user
    except:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials or insufficient permissions",
        headers={"WWW-Authenticate": "Bearer"},
    )