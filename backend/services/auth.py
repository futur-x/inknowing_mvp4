"""
Authentication service
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from loguru import logger

from backend.config import settings
from backend.core.security import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_password_hash,
    verify_password
)
from backend.core.exceptions import (
    AuthenticationError,
    ConflictError,
    ValidationError
)
from backend.models.user import User, MembershipType
from .user import UserService


class AuthService:
    """Authentication service for handling user authentication and authorization"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_service = UserService(db)

    async def register_with_phone(
        self,
        phone: str,
        nickname: Optional[str] = None
    ) -> User:
        """
        Register a new user with phone number

        Args:
            phone: Phone number
            nickname: Optional nickname

        Returns:
            Created user object

        Raises:
            ConflictError: If phone already exists
        """
        # Check if phone already exists
        existing_user = await self.user_service.get_by_phone(phone)
        if existing_user:
            raise ConflictError(
                detail="Phone number already registered",
                code="PHONE_EXISTS"
            )

        # Create user
        user = User(
            phone=phone,
            nickname=nickname or f"User_{phone[-4:]}",
            auth_provider="phone",
            membership=MembershipType.FREE.value,
            is_active=True,
            is_verified=False  # Will be verified after first SMS code
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        logger.info(f"New user registered with phone: {phone}")
        return user

    async def register_with_wechat(
        self,
        wechat_info: Dict[str, Any]
    ) -> User:
        """
        Register a new user with WeChat

        Args:
            wechat_info: WeChat user information

        Returns:
            Created user object

        Raises:
            ConflictError: If WeChat ID already exists
        """
        openid = wechat_info.get("openid")
        unionid = wechat_info.get("unionid")

        # Check if WeChat user already exists
        existing_user = await self.user_service.get_by_wechat(openid, unionid)
        if existing_user:
            raise ConflictError(
                detail="WeChat account already registered",
                code="WECHAT_EXISTS"
            )

        # Create user
        user = User(
            wechat_openid=openid,
            wechat_unionid=unionid,
            wechat_nickname=wechat_info.get("nickname"),
            nickname=wechat_info.get("nickname", "WeChat User"),
            avatar_url=wechat_info.get("headimgurl"),
            auth_provider="wechat",
            membership=MembershipType.FREE.value,
            is_active=True,
            is_verified=True  # WeChat users are considered verified
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        logger.info(f"New user registered with WeChat: {openid}")
        return user

    async def authenticate_phone(
        self,
        phone: str,
        code: str
    ) -> User:
        """
        Authenticate user with phone and SMS code

        Args:
            phone: Phone number
            code: SMS verification code

        Returns:
            Authenticated user object

        Raises:
            AuthenticationError: If authentication fails
        """
        # Get user by phone
        user = await self.user_service.get_by_phone(phone)
        if not user:
            raise AuthenticationError(
                detail="Phone number not registered",
                code="PHONE_NOT_FOUND"
            )

        # Verify SMS code
        # TODO: Implement actual SMS verification
        # For development, accept any 6-digit code
        if settings.ENVIRONMENT != "development":
            # Verify with SMS service
            pass

        # Check if user is active
        if not user.is_active:
            raise AuthenticationError(
                detail="User account is inactive",
                code="USER_INACTIVE"
            )

        # Mark user as verified if not already
        if not user.is_verified:
            user.is_verified = True
            await self.db.commit()

        return user

    async def authenticate_wechat(
        self,
        wechat_info: Dict[str, Any]
    ) -> User:
        """
        Authenticate user with WeChat info

        Args:
            wechat_info: WeChat user information

        Returns:
            Authenticated user object

        Raises:
            AuthenticationError: If authentication fails
        """
        openid = wechat_info.get("openid")
        unionid = wechat_info.get("unionid")

        # Get user by WeChat ID
        user = await self.user_service.get_by_wechat(openid, unionid)
        if not user:
            # Auto-register WeChat user if not exists
            user = await self.register_with_wechat(wechat_info)

        # Check if user is active
        if not user.is_active:
            raise AuthenticationError(
                detail="User account is inactive",
                code="USER_INACTIVE"
            )

        return user

    async def authenticate_password(
        self,
        username: str,
        password: str
    ) -> User:
        """
        Authenticate user with username/email and password

        Args:
            username: Username or email
            password: Password

        Returns:
            Authenticated user object

        Raises:
            AuthenticationError: If authentication fails
        """
        # Get user by username or email
        stmt = select(User).where(
            or_(
                User.username == username,
                User.email == username
            )
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise AuthenticationError(
                detail="Invalid username or password",
                code="INVALID_CREDENTIALS"
            )

        # Verify password
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise AuthenticationError(
                detail="Invalid username or password",
                code="INVALID_CREDENTIALS"
            )

        # Check if user is active
        if not user.is_active:
            raise AuthenticationError(
                detail="User account is inactive",
                code="USER_INACTIVE"
            )

        return user

    async def create_tokens(
        self,
        user_id: str,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Create access and refresh tokens for user

        Args:
            user_id: User ID
            additional_data: Additional data to include in tokens

        Returns:
            Dictionary with access_token and refresh_token
        """
        # Get user for additional info
        user = await self.user_service.get_by_id(user_id)
        if not user:
            raise AuthenticationError(
                detail="User not found",
                code="USER_NOT_FOUND"
            )

        # Prepare token data
        token_data = {
            "membership": user.membership,
            "is_admin": user.is_admin
        }
        if additional_data:
            token_data.update(additional_data)

        # Create tokens
        access_token = create_access_token(
            subject=user_id,
            additional_data=token_data
        )
        refresh_token = create_refresh_token(
            subject=user_id,
            additional_data={"membership": user.membership}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    async def refresh_tokens(self, refresh_token: str) -> Dict[str, str]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Refresh token

        Returns:
            Dictionary with new access_token and refresh_token

        Raises:
            AuthenticationError: If refresh token is invalid
        """
        # Verify refresh token
        try:
            payload = verify_token(refresh_token, token_type="refresh")
            user_id = payload.get("sub")
            if not user_id:
                raise AuthenticationError(
                    detail="Invalid refresh token",
                    code="INVALID_TOKEN"
                )
        except AuthenticationError:
            raise

        # Create new tokens
        return await self.create_tokens(user_id)

    async def update_last_login(self, user_id: str) -> None:
        """
        Update user's last login timestamp

        Args:
            user_id: User ID
        """
        user = await self.user_service.get_by_id(user_id)
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def send_sms_code(
        self,
        phone: str,
        purpose: str
    ) -> None:
        """
        Send SMS verification code

        Args:
            phone: Phone number
            purpose: Purpose of the code (register, login, reset_password)
        """
        # TODO: Implement actual SMS service integration
        # For now, just log the action
        logger.info(f"SMS code sent to {phone} for {purpose}")

        # In production, you would:
        # 1. Generate a random 6-digit code
        # 2. Store it in Redis with expiration
        # 3. Send via SMS provider (Aliyun, Twilio, etc.)
        pass

    async def verify_sms_code(
        self,
        phone: str,
        code: str
    ) -> bool:
        """
        Verify SMS verification code

        Args:
            phone: Phone number
            code: Verification code

        Returns:
            True if code is valid, False otherwise
        """
        # TODO: Implement actual verification with Redis
        # For development, accept any 6-digit code
        if settings.ENVIRONMENT == "development":
            return len(code) == 6 and code.isdigit()

        # In production, check Redis for the stored code
        return False

    async def set_password(
        self,
        user_id: str,
        password: str
    ) -> None:
        """
        Set user password

        Args:
            user_id: User ID
            password: New password
        """
        user = await self.user_service.get_by_id(user_id)
        if not user:
            raise AuthenticationError(
                detail="User not found",
                code="USER_NOT_FOUND"
            )

        # Hash and set password
        user.password_hash = get_password_hash(password)
        await self.db.commit()

    async def reset_password(
        self,
        phone: str,
        code: str,
        new_password: str
    ) -> None:
        """
        Reset user password with SMS verification

        Args:
            phone: Phone number
            code: SMS verification code
            new_password: New password
        """
        # Verify SMS code
        if not await self.verify_sms_code(phone, code):
            raise ValidationError(
                detail="Invalid verification code",
                code="INVALID_CODE"
            )

        # Get user
        user = await self.user_service.get_by_phone(phone)
        if not user:
            raise AuthenticationError(
                detail="Phone number not registered",
                code="PHONE_NOT_FOUND"
            )

        # Set new password
        await self.set_password(user.id, new_password)