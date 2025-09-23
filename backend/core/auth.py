"""
Authentication utilities - compatibility layer
"""
from .dependencies import (
    get_current_user,
    get_current_active_user,
    get_current_premium_user,
    get_optional_current_user,
    get_admin_user,
    rate_limit_dialogue,
    rate_limit_upload,
)

# Create aliases for backward compatibility
require_user = get_current_active_user
require_premium = get_current_premium_user
optional_user = get_optional_current_user
require_admin = get_admin_user

__all__ = [
    "get_current_user",
    "get_current_active_user",
    "get_current_premium_user",
    "get_optional_current_user",
    "get_admin_user",
    "require_user",
    "require_premium",
    "require_admin",
    "optional_user",
    "rate_limit_dialogue",
    "rate_limit_upload",
]