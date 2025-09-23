"""
Admin WebSocket endpoints for real-time monitoring
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Set, Dict, Any
import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from backend.config.database import get_db
from jose import JWTError, jwt
from backend.config.settings import settings

# Admin JWT settings
ADMIN_SECRET_KEY = settings.ADMIN_SECRET_KEY if hasattr(settings, 'ADMIN_SECRET_KEY') else settings.SECRET_KEY + "_admin"
ALGORITHM = "HS256"

async def verify_admin_token(token: str) -> Dict[str, Any]:
    """
    Verify admin JWT token for WebSocket connection
    """
    try:
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=[ALGORITHM])

        # Check if it's an admin token
        if payload.get("type") != "admin":
            return None

        return payload
    except JWTError:
        return None
from backend.models import (
    User, DialogueSession, Book, Payment,
    SystemMetric, ApiHealthCheck
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Admin - WebSocket"])

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.admin_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.admin_connections[admin_id] = websocket
        logger.info(f"Admin {admin_id} connected via WebSocket")

    def disconnect(self, websocket: WebSocket, admin_id: str = None):
        self.active_connections.discard(websocket)
        if admin_id and admin_id in self.admin_connections:
            del self.admin_connections[admin_id]
        logger.info(f"Admin {admin_id} disconnected from WebSocket")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws/admin/monitor")
async def websocket_monitor(
    websocket: WebSocket,
    token: str = Query(..., description="Admin authentication token")
):
    """
    WebSocket endpoint for real-time admin monitoring
    Sends updates about system metrics, active users, and ongoing dialogues
    """
    try:
        # Verify admin token
        admin_info = await verify_admin_token(token)
        if not admin_info:
            await websocket.close(code=1008, reason="Invalid authentication")
            return

        admin_id = admin_info.get("id", "unknown")

        # Accept connection
        await manager.connect(websocket, admin_id)

        # Get database session
        db = next(get_db())

        try:
            # Send initial connection success message
            await manager.send_personal_message(
                json.dumps({
                    "type": "connection",
                    "status": "connected",
                    "admin_id": admin_id,
                    "timestamp": datetime.utcnow().isoformat()
                }),
                websocket
            )

            # Start monitoring loop
            while True:
                try:
                    # Collect monitoring data
                    monitoring_data = await collect_monitoring_data(db)

                    # Send monitoring update
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "monitoring_update",
                            "data": monitoring_data,
                            "timestamp": datetime.utcnow().isoformat()
                        }),
                        websocket
                    )

                    # Wait for 5 seconds before next update
                    await asyncio.sleep(5)

                    # Also listen for incoming messages (for ping/pong)
                    try:
                        message = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                        if message == "ping":
                            await manager.send_personal_message("pong", websocket)
                    except asyncio.TimeoutError:
                        pass

                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {str(e)}")
                    continue

        finally:
            db.close()
            manager.disconnect(websocket, admin_id)

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close(code=1011, reason="Internal server error")

async def collect_monitoring_data(db: Session) -> Dict[str, Any]:
    """
    Collect real-time monitoring data from database
    """
    try:
        # Active users (logged in within last 5 minutes)
        active_users = db.query(func.count(User.id)).filter(
            User.last_login >= datetime.utcnow().replace(second=0, microsecond=0)
        ).scalar()

        # Active dialogues (within last 5 minutes)
        active_dialogues = db.query(func.count(DialogueSession.id)).filter(
            DialogueSession.last_message_at >= datetime.utcnow().replace(second=0, microsecond=0)
        ).scalar()

        # Recent payments
        recent_payments = db.query(func.count(Payment.id)).filter(
            and_(
                Payment.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
                Payment.status == "completed"
            )
        ).scalar()

        # System metrics (simplified)
        total_users = db.query(func.count(User.id)).scalar()
        total_books = db.query(func.count(Book.id)).scalar()

        # API health (check if there are recent health checks)
        api_health = "operational"  # Simplified

        return {
            "active_users": active_users,
            "active_dialogues": active_dialogues,
            "recent_payments": recent_payments,
            "total_users": total_users,
            "total_books": total_books,
            "api_health": api_health,
            "server_time": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error collecting monitoring data: {str(e)}")
        return {
            "error": "Failed to collect monitoring data",
            "timestamp": datetime.utcnow().isoformat()
        }

@router.websocket("/ws/admin/dialogues/realtime")
async def websocket_dialogues_realtime(
    websocket: WebSocket,
    token: str = Query(..., description="Admin authentication token")
):
    """
    WebSocket endpoint for real-time dialogue monitoring
    """
    try:
        # Verify admin token
        admin_info = await verify_admin_token(token)
        if not admin_info:
            await websocket.close(code=1008, reason="Invalid authentication")
            return

        admin_id = admin_info.get("id", "unknown")

        # Accept connection
        await manager.connect(websocket, admin_id)

        # Get database session
        db = next(get_db())

        try:
            # Send initial connection success message
            await manager.send_personal_message(
                json.dumps({
                    "type": "connection",
                    "status": "connected",
                    "admin_id": admin_id,
                    "timestamp": datetime.utcnow().isoformat()
                }),
                websocket
            )

            # Monitor dialogues in real-time
            while True:
                try:
                    # Get active dialogues
                    active_dialogues = db.query(DialogueSession).filter(
                        DialogueSession.last_message_at >= datetime.utcnow().replace(second=0, microsecond=0)
                    ).limit(10).all()

                    dialogue_data = [
                        {
                            "id": str(d.id),
                            "user_id": str(d.user_id),
                            "book_id": str(d.book_id) if d.book_id else None,
                            "last_message": d.last_message_at.isoformat() if d.last_message_at else None,
                            "status": d.status
                        }
                        for d in active_dialogues
                    ]

                    # Send dialogue update
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "dialogue_update",
                            "data": dialogue_data,
                            "timestamp": datetime.utcnow().isoformat()
                        }),
                        websocket
                    )

                    # Wait for 3 seconds before next update
                    await asyncio.sleep(3)

                except WebSocketDisconnect:
                    break
                except Exception as e:
                    logger.error(f"Error in dialogue monitoring: {str(e)}")
                    continue

        finally:
            db.close()
            manager.disconnect(websocket, admin_id)

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close(code=1011, reason="Internal server error")