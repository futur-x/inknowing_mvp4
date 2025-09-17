"""
Authentication API endpoints
"""
import uuid
from datetime import datetime, timedelta
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from config.database import get_db
from config.settings import settings
from core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    verify_token,
    generate_username,
    generate_verification_code,
)
from models.user import User, Token, MembershipType, UserStatus
from schemas.auth import (
    PhoneRegistration,
    WeChatRegistration,
    PhoneLogin,
    WeChatLogin,
    RefreshTokenRequest,
    VerificationCodeRequest,
    AuthResponse,
    UserResponse,
    ErrorResponse,
)

router = APIRouter()


async def create_auth_response(user: User) -> AuthResponse:
    """Create authentication response with tokens"""
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Union[PhoneRegistration, WeChatRegistration],
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user with phone or WeChat

    Business Logic: User Journey Start → Registration
    """
    if isinstance(request, PhoneRegistration):
        # Check if phone already exists
        result = await db.execute(
            select(User).where(User.phone == request.phone, User.deleted_at.is_(None))
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered",
            )

        # TODO: Verify SMS code from cache/database
        # For now, accept any valid format code

        # Create new user
        user = User(
            id=uuid.uuid4(),
            username=generate_username(phone=request.phone),
            phone=request.phone,
            phone_verified=True,
            nickname=request.nickname or f"User_{request.phone[-4:]}",
            membership=MembershipType.FREE,
            status=UserStatus.ACTIVE,
            password_hash=get_password_hash(request.password) if request.password else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    else:  # WeChatRegistration
        # TODO: Implement WeChat OAuth flow
        # For now, create a mock user
        wechat_openid = f"wx_{request.code[:10]}"  # Mock OpenID

        # Check if WeChat user exists
        result = await db.execute(
            select(User).where(
                User.wechat_openid == wechat_openid,
                User.deleted_at.is_(None)
            )
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Auto login for existing WeChat user
            return await create_auth_response(existing_user)

        # Create new WeChat user
        user = User(
            id=uuid.uuid4(),
            username=generate_username(wechat_openid=wechat_openid),
            wechat_openid=wechat_openid,
            nickname=request.nickname or f"WeChat_User_{uuid.uuid4().hex[:6]}",
            membership=MembershipType.FREE,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return await create_auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Union[PhoneLogin, WeChatLogin],
    db: AsyncSession = Depends(get_db),
):
    """
    User login with phone/password or WeChat

    Business Logic: User Authentication State Transition
    """
    if isinstance(request, PhoneLogin):
        # Find user by phone
        result = await db.execute(
            select(User).where(User.phone == request.phone, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        # Verify password or SMS code
        if request.password:
            if not user.password_hash or not verify_password(request.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials",
                )
        elif request.code:
            # TODO: Verify SMS code from cache/database
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password or verification code required",
            )

    else:  # WeChatLogin
        # TODO: Implement WeChat OAuth flow
        wechat_openid = f"wx_{request.code[:10]}"  # Mock OpenID

        result = await db.execute(
            select(User).where(
                User.wechat_openid == wechat_openid,
                User.deleted_at.is_(None)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="WeChat user not found. Please register first.",
            )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or banned",
        )

    # Update login stats
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    await db.commit()

    return await create_auth_response(user)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange refresh token for new access token"""
    payload = verify_token(request.refresh_token, token_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Get user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or inactive",
        )

    return await create_auth_response(user)


@router.post("/verify-code", status_code=status.HTTP_200_OK)
async def send_verification_code(
    request: VerificationCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send SMS verification code for phone registration/login"""
    # TODO: Implement actual SMS sending
    # For now, just generate and store the code
    code = generate_verification_code()

    # In production, store this in Redis with TTL
    # For demo, just return success
    return {
        "message": "Verification code sent successfully",
        "debug_code": code if settings.DEBUG else None,  # Only show in debug mode
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    User logout

    Note: With JWT, logout is typically handled client-side by removing the token.
    This endpoint can be used to blacklist tokens if needed.
    """
    # TODO: Implement token blacklisting if needed
    return {"message": "Logout successful"}