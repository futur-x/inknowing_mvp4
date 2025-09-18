"""
Authentication API endpoints
"""
import uuid
from datetime import datetime, timedelta
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status, Response
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


async def verify_sms_code(phone: str, code: str) -> bool:
    """
    Verify SMS code for phone number

    In test/development mode, accept '123456' as valid code
    In production, verify against cached/stored code
    """
    # Check if we're in test/development mode
    if settings.ENVIRONMENT in ["development", "test", "testing"]:
        # Accept fixed test code in test/dev mode
        if code == "123456":
            return True

    # TODO: In production, verify against Redis/cache
    # For now, accept any 6-digit code in development
    if settings.DEBUG:
        return len(code) == 6 and code.isdigit()

    return False


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
    response: Response,
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

        # Verify SMS code
        if not await verify_sms_code(request.phone, request.code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification code",
            )

        # Create new user
        user = User(
            id=uuid.uuid4(),
            username=generate_username(phone=request.phone),
            phone=request.phone,
            phone_verified=True,
            nickname=request.nickname or f"User_{request.phone[-4:]}",
            membership="free",  # Use string value directly
            status="active",  # Use string value directly
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
            membership="free",  # Use string value directly
            status="active",  # Use string value directly
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    auth_response = await create_auth_response(user)

    # Set httponly cookies for secure token storage
    response.set_cookie(
        key="access_token",
        value=auth_response.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=auth_response.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        path="/"
    )

    return auth_response


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Union[PhoneLogin, WeChatLogin],
    response: Response,
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
            # Verify SMS code
            if not await verify_sms_code(request.phone, request.code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid verification code",
                )
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

    auth_response = await create_auth_response(user)

    # Set httponly cookie for secure token storage
    response.set_cookie(
        key="access_token",
        value=auth_response.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=auth_response.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        path="/"
    )

    return auth_response


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
async def logout(response: Response):
    """
    User logout

    Clear authentication cookies to log out the user.
    """
    # Clear the authentication cookies
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")

    # TODO: Implement token blacklisting if needed
    return {"message": "Logout successful"}