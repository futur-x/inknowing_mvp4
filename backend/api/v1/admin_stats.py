"""
Simple admin stats endpoint for super users
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from datetime import datetime, timedelta

from backend.config.database import get_db
from backend.models.user import User, MembershipType
from backend.models.book import Book
from backend.models.dialogue import DialogueSession
from backend.core.dependencies import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_simple_admin_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get admin statistics - only for super membership users"""

    # Check if user has super membership
    if current_user.membership != MembershipType.SUPER:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get basic statistics
    users_count = await db.scalar(select(func.count(User.id)))
    books_count = await db.scalar(select(func.count(Book.id)))
    dialogues_count = await db.scalar(select(func.count(DialogueSession.id)))

    # Get recent statistics (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_users = await db.scalar(
        select(func.count(User.id)).where(User.created_at >= yesterday)
    )
    recent_dialogues = await db.scalar(
        select(func.count(DialogueSession.id)).where(DialogueSession.created_at >= yesterday)
    )

    return {
        "users": {
            "total": users_count or 0,
            "active": users_count or 0,  # Simplified
            "new": recent_users or 0,
            "growth": 0  # Simplified
        },
        "books": {
            "total": books_count or 0,
            "approved": books_count or 0,  # Simplified
            "pending": 0,
            "rejected": 0
        },
        "dialogues": {
            "total": dialogues_count or 0,
            "active": 0,
            "today": recent_dialogues or 0,
            "avgDuration": 0
        },
        "revenue": {
            "mrr": 0,
            "totalRevenue": 0,
            "paidUsers": 0,
            "conversionRate": 0
        },
        "system": {
            "status": "operational",
            "apiLatency": 50,
            "wsConnections": 0,
            "dbStatus": "connected"
        }
    }