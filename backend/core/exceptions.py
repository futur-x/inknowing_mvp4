"""
Custom exceptions for InKnowing API
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException


class InKnowingException(HTTPException):
    """Base exception for InKnowing API"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code


class AuthenticationError(InKnowingException):
    """Authentication related errors"""

    def __init__(self, detail: str = "Authentication failed", code: str = "AUTH_ERROR"):
        super().__init__(status_code=401, detail=detail, code=code)


class PermissionDeniedError(InKnowingException):
    """Permission denied errors"""

    def __init__(self, detail: str = "Permission denied", code: str = "PERMISSION_DENIED"):
        super().__init__(status_code=403, detail=detail, code=code)


class ResourceNotFoundError(InKnowingException):
    """Resource not found errors"""

    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(status_code=404, detail=detail, code=code)


class ValidationError(InKnowingException):
    """Validation errors"""

    def __init__(self, detail: str = "Validation failed", code: str = "VALIDATION_ERROR"):
        super().__init__(status_code=422, detail=detail, code=code)


class ConflictError(InKnowingException):
    """Resource conflict errors"""

    def __init__(self, detail: str = "Resource conflict", code: str = "CONFLICT"):
        super().__init__(status_code=409, detail=detail, code=code)


class RateLimitError(InKnowingException):
    """Rate limit exceeded errors"""

    def __init__(self, detail: str = "Rate limit exceeded", code: str = "RATE_LIMIT_EXCEEDED"):
        super().__init__(status_code=429, detail=detail, code=code)


class PaymentError(InKnowingException):
    """Payment related errors"""

    def __init__(self, detail: str = "Payment processing failed", code: str = "PAYMENT_ERROR"):
        super().__init__(status_code=402, detail=detail, code=code)


class QuotaExceededError(InKnowingException):
    """Quota exceeded errors"""

    def __init__(self, detail: str = "Quota exceeded", code: str = "QUOTA_EXCEEDED"):
        super().__init__(status_code=429, detail=detail, code=code)


class ExternalServiceError(InKnowingException):
    """External service errors (AI, SMS, etc.)"""

    def __init__(self, detail: str = "External service error", code: str = "EXTERNAL_SERVICE_ERROR"):
        super().__init__(status_code=503, detail=detail, code=code)


class FileUploadError(InKnowingException):
    """File upload related errors"""

    def __init__(self, detail: str = "File upload failed", code: str = "UPLOAD_ERROR"):
        super().__init__(status_code=400, detail=detail, code=code)


# Aliases for compatibility with existing code
NotFoundException = ResourceNotFoundError
BadRequestException = ValidationError
ForbiddenException = PermissionDeniedError
ConflictException = ConflictError
PaymentException = PaymentError