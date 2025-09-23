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
from .admin import router as admin_router
# from .admin_stats import router as admin_stats_router  # Commented out - conflicts with admin.py /stats endpoint
from .ai_model import router as ai_model_router
from .admin_dialogue import router as admin_dialogue_router
from .analytics import router as analytics_router
from .monitoring import router as monitoring_router
from .admin_websocket import router as admin_websocket_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
# Note: tags are already defined in each router file, don't duplicate them here
api_router.include_router(auth_router, prefix="/auth")
api_router.include_router(users_router, prefix="/users")
api_router.include_router(books_router, prefix="/books")
api_router.include_router(search_router, prefix="/search")
api_router.include_router(dialogue_router)  # Already has prefix="/dialogues"
api_router.include_router(upload_router)  # Already has prefix="/uploads"
api_router.include_router(payment_router)  # Already has prefix="/payment"
api_router.include_router(admin_router)  # Already has prefix="/admin"
# api_router.include_router(admin_stats_router, prefix="/admin")  # Commented out - conflicts with admin.py /stats endpoint
api_router.include_router(ai_model_router)  # Already has prefix="/admin/models"
api_router.include_router(admin_dialogue_router)  # Already has prefix="/admin/dialogues"
api_router.include_router(analytics_router)  # Already has prefix="/admin/analytics"
api_router.include_router(monitoring_router)  # Already has prefix="/admin/monitoring"
api_router.include_router(admin_websocket_router)  # WebSocket endpoints

__all__ = ["api_router"]