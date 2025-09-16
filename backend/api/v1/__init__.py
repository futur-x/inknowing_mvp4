"""
API v1 module
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .books import router as books_router
from .search import router as search_router
from .dialogue import router as dialogue_router
from .upload import router as upload_router
from .payment import router as payment_router
# from .admin import router as admin_router  # Has dependency issues
from .ai_model import router as ai_model_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(books_router, tags=["Books"])
api_router.include_router(search_router, tags=["Search"])
api_router.include_router(dialogue_router, tags=["Dialogue"])
api_router.include_router(upload_router, tags=["Uploads"])
api_router.include_router(payment_router, tags=["Payment"])
# api_router.include_router(admin_router, tags=["Admin"])  # Has dependency issues
api_router.include_router(ai_model_router, tags=["Admin - AI Models"])

__all__ = ["api_router"]