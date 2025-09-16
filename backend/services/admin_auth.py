"""
Admin authentication service
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from config.settings import settings
from models.admin import Admin, AdminToken, AdminStatus, AuditLog, AuditActionType
from core.logger import logger

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin JWT settings - use different secret from user JWT
ADMIN_SECRET_KEY = settings.ADMIN_SECRET_KEY if hasattr(settings, 'ADMIN_SECRET_KEY') else settings.SECRET_KEY + "_admin"
ALGORITHM = "HS256"
ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Admin tokens expire faster for security
ADMIN_REFRESH_TOKEN_EXPIRE_DAYS = 7


class AdminAuthService:
    """Admin authentication service"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_admin(
        self,
        username: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[Admin]:
        """
        Authenticate admin user

        Args:
            username: Admin username or email
            password: Plain password
            ip_address: Client IP address for audit
            user_agent: Client user agent for audit

        Returns:
            Admin object if authentication successful, None otherwise
        """
        try:
            # Find admin by username or email
            stmt = select(Admin).where(
                (Admin.username == username) | (Admin.email == username)
            )
            result = await self.db.execute(stmt)
            admin = result.scalar_one_or_none()

            if not admin:
                await self._log_failed_login(username, ip_address, user_agent, "Admin not found")
                return None

            # Check if account is locked
            if admin.locked_until and admin.locked_until > datetime.utcnow():
                await self._log_failed_login(username, ip_address, user_agent, "Account locked")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account locked until {admin.locked_until}"
                )

            # Check account status
            if admin.status != AdminStatus.ACTIVE:
                await self._log_failed_login(username, ip_address, user_agent, f"Account {admin.status}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is {admin.status}"
                )

            # Verify password
            if not self.verify_password(password, admin.password_hash):
                # Increment failed login attempts
                admin.failed_login_attempts += 1

                # Lock account after 5 failed attempts
                if admin.failed_login_attempts >= 5:
                    admin.locked_until = datetime.utcnow() + timedelta(hours=1)
                    admin.status = AdminStatus.SUSPENDED

                await self.db.commit()
                await self._log_failed_login(username, ip_address, user_agent, "Invalid password")
                return None

            # Reset failed login attempts
            admin.failed_login_attempts = 0
            admin.locked_until = None
            admin.last_login = datetime.utcnow()

            # Log successful login
            await self._log_audit(
                admin_id=admin.id,
                action=AuditActionType.LOGIN,
                description=f"Admin {admin.username} logged in",
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )

            await self.db.commit()
            return admin

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Admin authentication error: {e}")
            return None

    async def create_admin_tokens(
        self,
        admin: Admin,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create access and refresh tokens for admin

        Args:
            admin: Admin object
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Dictionary with tokens and admin info
        """
        # Create access token
        access_token_expires = datetime.utcnow() + timedelta(minutes=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={
                "sub": admin.id,
                "username": admin.username,
                "role": admin.role,
                "permissions": admin.get_role_permissions() + admin.permissions,
                "type": "admin"
            },
            expires_delta=timedelta(minutes=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        # Create refresh token
        refresh_token_expires = datetime.utcnow() + timedelta(days=ADMIN_REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = self.create_refresh_token(admin.id)

        # Store token in database for tracking and revocation
        admin_token = AdminToken(
            admin_id=admin.id,
            token=access_token,
            refresh_token=refresh_token,
            expires_at=access_token_expires,
            refresh_expires_at=refresh_token_expires,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(admin_token)
        await self.db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "admin": {
                "id": admin.id,
                "username": admin.username,
                "role": admin.role,
                "permissions": admin.get_role_permissions() + admin.permissions,
                "display_name": admin.display_name,
                "avatar_url": admin.avatar_url
            }
        }

    async def refresh_admin_token(
        self,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Refresh admin access token using refresh token

        Args:
            refresh_token: Refresh token
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            New tokens and admin info
        """
        try:
            # Find token in database
            stmt = select(AdminToken).where(
                AdminToken.refresh_token == refresh_token,
                AdminToken.revoked == False
            )
            result = await self.db.execute(stmt)
            token_record = result.scalar_one_or_none()

            if not token_record:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )

            # Check if refresh token expired
            if token_record.refresh_expires_at < datetime.utcnow():
                token_record.revoked = True
                await self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token expired"
                )

            # Get admin
            stmt = select(Admin).where(Admin.id == token_record.admin_id)
            result = await self.db.execute(stmt)
            admin = result.scalar_one_or_none()

            if not admin or admin.status != AdminStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin account not active"
                )

            # Revoke old token
            token_record.revoked = True

            # Create new tokens
            return await self.create_admin_tokens(admin, ip_address, user_agent)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not refresh token"
            )

    async def verify_admin_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify admin JWT token

        Args:
            token: JWT token

        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])

            # Check if it's an admin token
            if payload.get("type") != "admin":
                return None

            # Check if token is revoked
            stmt = select(AdminToken).where(
                AdminToken.token == token,
                AdminToken.revoked == False
            )
            result = await self.db.execute(stmt)
            token_record = result.scalar_one_or_none()

            if not token_record:
                return None

            # Check expiration
            if token_record.expires_at < datetime.utcnow():
                token_record.revoked = True
                await self.db.commit()
                return None

            # Update usage stats
            token_record.last_used_at = datetime.utcnow()
            token_record.usage_count += 1
            await self.db.commit()

            return payload

        except JWTError:
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None

    async def get_current_admin(self, token: str) -> Optional[Admin]:
        """
        Get current admin from token

        Args:
            token: JWT token

        Returns:
            Admin object if token valid, None otherwise
        """
        payload = await self.verify_admin_token(token)
        if not payload:
            return None

        admin_id = payload.get("sub")
        if not admin_id:
            return None

        stmt = select(Admin).where(
            Admin.id == admin_id,
            Admin.status == AdminStatus.ACTIVE
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def logout_admin(
        self,
        token: str,
        admin: Admin,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Logout admin by revoking token

        Args:
            token: JWT token to revoke
            admin: Admin object
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            True if successful
        """
        try:
            # Revoke token
            stmt = select(AdminToken).where(AdminToken.token == token)
            result = await self.db.execute(stmt)
            token_record = result.scalar_one_or_none()

            if token_record:
                token_record.revoked = True

            # Log logout
            await self._log_audit(
                admin_id=admin.id,
                action=AuditActionType.LOGOUT,
                description=f"Admin {admin.username} logged out",
                ip_address=ip_address,
                user_agent=user_agent,
                success=True
            )

            await self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False

    async def change_admin_password(
        self,
        admin: Admin,
        old_password: str,
        new_password: str
    ) -> bool:
        """
        Change admin password

        Args:
            admin: Admin object
            old_password: Current password
            new_password: New password

        Returns:
            True if successful
        """
        try:
            # Verify old password
            if not self.verify_password(old_password, admin.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid current password"
                )

            # Hash new password
            admin.password_hash = self.get_password_hash(new_password)
            admin.last_password_change = datetime.utcnow()

            # Revoke all existing tokens
            stmt = select(AdminToken).where(
                AdminToken.admin_id == admin.id,
                AdminToken.revoked == False
            )
            result = await self.db.execute(stmt)
            tokens = result.scalars().all()

            for token in tokens:
                token.revoked = True

            await self.db.commit()
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Password change error: {e}")
            return False

    # Helper methods
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, ADMIN_SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def create_refresh_token(admin_id: str) -> str:
        """Create refresh token"""
        return secrets.token_urlsafe(32)

    async def _log_audit(
        self,
        admin_id: str,
        action: AuditActionType,
        description: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ):
        """Create audit log entry"""
        audit_log = AuditLog(
            admin_id=admin_id,
            action=action,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values
        )
        self.db.add(audit_log)

    async def _log_failed_login(
        self,
        username: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        reason: str
    ):
        """Log failed login attempt"""
        # Try to find admin ID
        stmt = select(Admin).where(
            (Admin.username == username) | (Admin.email == username)
        )
        result = await self.db.execute(stmt)
        admin = result.scalar_one_or_none()

        audit_log = AuditLog(
            admin_id=admin.id if admin else None,
            action=AuditActionType.FAILED_LOGIN,
            description=f"Failed login attempt for {username}: {reason}",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            metadata={"username": username, "reason": reason}
        )
        self.db.add(audit_log)