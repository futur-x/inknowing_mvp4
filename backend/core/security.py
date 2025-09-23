"""
Security utilities for authentication and authorization
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64

from backend.config.settings import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize encryption
def _get_encryption_key() -> bytes:
    """Get or generate encryption key"""
    # Use secret key as base for encryption key
    key_base = settings.SECRET_KEY.encode()
    # Pad or truncate to 32 bytes for Fernet
    if len(key_base) >= 32:
        return base64.urlsafe_b64encode(key_base[:32])
    else:
        # Pad with zeros if too short
        padded = key_base + b'\x00' * (32 - len(key_base))
        return base64.urlsafe_b64encode(padded)

_cipher = Fernet(_get_encryption_key())


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token

    Args:
        data: Token payload data
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT refresh token

    Args:
        data: Token payload data
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4())  # JWT ID for refresh token tracking
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode JWT token

    Args:
        token: JWT token to verify
        token_type: Expected token type ('access' or 'refresh')

    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password

    Returns:
        True if password matches
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash password

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def generate_verification_code() -> str:
    """
    Generate 6-digit verification code for SMS/email

    Returns:
        6-digit code as string
    """
    import random
    return str(random.randint(100000, 999999))


def generate_username(phone: Optional[str] = None, wechat_openid: Optional[str] = None) -> str:
    """
    Generate unique username based on phone or WeChat OpenID

    Args:
        phone: Phone number
        wechat_openid: WeChat OpenID

    Returns:
        Generated username
    """
    if phone:
        # Use last 4 digits of phone + random suffix
        return f"user_{phone[-4:]}_{uuid.uuid4().hex[:6]}"
    elif wechat_openid:
        # Use part of OpenID + random suffix
        return f"wx_{wechat_openid[:8]}_{uuid.uuid4().hex[:6]}"
    else:
        # Fallback to UUID
        return f"user_{uuid.uuid4().hex[:12]}"


def mask_phone(phone: str) -> str:
    """
    Mask phone number for display (e.g., 138****8000)

    Args:
        phone: Phone number

    Returns:
        Masked phone number
    """
    if len(phone) >= 11:
        return f"{phone[:3]}****{phone[-4:]}"
    return phone


def mask_email(email: str) -> str:
    """
    Mask email for display (e.g., u***@example.com)

    Args:
        email: Email address

    Returns:
        Masked email
    """
    if "@" in email:
        username, domain = email.split("@")
        if len(username) > 3:
            return f"{username[0]}***@{domain}"
        return f"***@{domain}"
    return email


def encrypt_data(data: str) -> str:
    """
    Encrypt sensitive data like API keys

    Args:
        data: Plain text data to encrypt

    Returns:
        Encrypted data as base64 string
    """
    if not data:
        return ""
    return _cipher.encrypt(data.encode()).decode()


def decrypt_data(encrypted_data: str) -> str:
    """
    Decrypt sensitive data like API keys

    Args:
        encrypted_data: Base64 encrypted data

    Returns:
        Decrypted plain text data
    """
    if not encrypted_data:
        return ""
    return _cipher.decrypt(encrypted_data.encode()).decode()