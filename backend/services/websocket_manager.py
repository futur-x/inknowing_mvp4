"""
WebSocket connection manager for real-time features
"""
from typing import Dict, List, Optional, Any
from fastapi import WebSocket
import json
import asyncio
from uuid import uuid4
from datetime import datetime
from backend.core.logger import logger


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        # 存储活跃的WebSocket连接
        # connection_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

        # 存储连接的元数据
        # connection_id -> metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

        # 存储会话ID到连接ID的映射
        # session_id -> [connection_ids]
        self.session_connections: Dict[str, List[str]] = {}

        # 存储用户ID到连接ID的映射
        # user_id -> [connection_ids]
        self.user_connections: Dict[str, List[str]] = {}

        # 存储管理员连接
        self.admin_connections: List[str] = []

    async def connect(self, websocket: WebSocket, connection_type: str = "user",
                     user_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """Accept and register a new WebSocket connection"""
        connection_id = str(uuid4())

        await websocket.accept()
        self.active_connections[connection_id] = websocket

        # 存储连接元数据
        self.connection_metadata[connection_id] = {
            "type": connection_type,
            "user_id": user_id,
            "session_id": session_id,
            "connected_at": datetime.utcnow().isoformat()
        }

        # 根据连接类型进行分类
        if connection_type == "admin":
            self.admin_connections.append(connection_id)

        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(connection_id)

        if session_id:
            if session_id not in self.session_connections:
                self.session_connections[session_id] = []
            self.session_connections[session_id].append(connection_id)

        logger.info(f"WebSocket connected: {connection_id} (type: {connection_type})")
        return connection_id

    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection"""
        if connection_id not in self.active_connections:
            return

        # 获取连接元数据
        metadata = self.connection_metadata.get(connection_id, {})

        # 从各种映射中移除
        if metadata.get("type") == "admin":
            self.admin_connections = [c for c in self.admin_connections if c != connection_id]

        user_id = metadata.get("user_id")
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id] = [
                c for c in self.user_connections[user_id] if c != connection_id
            ]
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

        session_id = metadata.get("session_id")
        if session_id and session_id in self.session_connections:
            self.session_connections[session_id] = [
                c for c in self.session_connections[session_id] if c != connection_id
            ]
            if not self.session_connections[session_id]:
                del self.session_connections[session_id]

        # 移除连接
        del self.active_connections[connection_id]
        del self.connection_metadata[connection_id]

        logger.info(f"WebSocket disconnected: {connection_id}")

    async def send_personal_message(self, message: Any, connection_id: str):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                if isinstance(message, dict):
                    await websocket.send_json(message)
                else:
                    await websocket.send_text(str(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(connection_id)

    async def send_to_user(self, user_id: str, message: Any):
        """Send message to all connections of a specific user"""
        if user_id in self.user_connections:
            tasks = []
            for connection_id in self.user_connections[user_id]:
                tasks.append(self.send_personal_message(message, connection_id))
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to_session(self, session_id: str, message: Any):
        """Send message to all connections in a specific session"""
        if session_id in self.session_connections:
            tasks = []
            for connection_id in self.session_connections[session_id]:
                tasks.append(self.send_personal_message(message, connection_id))
            await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_to_admins(self, message: Any):
        """Broadcast message to all admin connections"""
        tasks = []
        for connection_id in self.admin_connections:
            tasks.append(self.send_personal_message(message, connection_id))
        await asyncio.gather(*tasks, return_exceptions=True)

    async def broadcast_all(self, message: Any):
        """Broadcast message to all connected clients"""
        tasks = []
        for connection_id in self.active_connections:
            tasks.append(self.send_personal_message(message, connection_id))
        await asyncio.gather(*tasks, return_exceptions=True)

    def get_connection_info(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific connection"""
        return self.connection_metadata.get(connection_id)

    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs"""
        return list(self.session_connections.keys())

    def get_online_users(self) -> List[str]:
        """Get list of online user IDs"""
        return list(self.user_connections.keys())

    def get_connection_count(self) -> Dict[str, int]:
        """Get count of different types of connections"""
        return {
            "total": len(self.active_connections),
            "admins": len(self.admin_connections),
            "users": len(self.user_connections),
            "sessions": len(self.session_connections)
        }


class WebSocketManager:
    """Singleton WebSocket manager"""
    _instance = None
    _connection_manager = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._connection_manager = ConnectionManager()
        return cls._instance

    async def connect(self, websocket: WebSocket, connection_type: str = "user",
                     user_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """Connect a WebSocket"""
        return await self._connection_manager.connect(websocket, connection_type, user_id, session_id)

    def disconnect(self, connection_id: str):
        """Disconnect a WebSocket"""
        self._connection_manager.disconnect(connection_id)

    async def send_to_user(self, user_id: str, message: Any):
        """Send message to user"""
        await self._connection_manager.send_to_user(user_id, message)

    async def send_to_session(self, session_id: str, message: Any):
        """Send message to session"""
        await self._connection_manager.send_to_session(session_id, message)

    async def broadcast_to_admins(self, message: Any):
        """Broadcast to admins"""
        await self._connection_manager.broadcast_to_admins(message)

    async def notify_new_dialogue(self, dialogue_data: Dict[str, Any]):
        """Notify admins about new dialogue"""
        await self.broadcast_to_admins({
            "type": "new_dialogue",
            "data": dialogue_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def notify_dialogue_message(self, session_id: str, message_data: Dict[str, Any]):
        """Notify about new message in dialogue"""
        # 通知会话参与者
        await self.send_to_session(session_id, {
            "type": "new_message",
            "data": message_data,
            "timestamp": datetime.utcnow().isoformat()
        })

        # 通知管理员
        await self.broadcast_to_admins({
            "type": "dialogue_message",
            "session_id": session_id,
            "data": message_data,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def notify_dialogue_end(self, session_id: str, reason: str = "normal"):
        """Notify about dialogue end"""
        notification = {
            "type": "dialogue_ended",
            "session_id": session_id,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }

        # 通知会话参与者
        await self.send_to_session(session_id, notification)

        # 通知管理员
        await self.broadcast_to_admins(notification)

    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket statistics"""
        return {
            "connections": self._connection_manager.get_connection_count(),
            "active_sessions": self._connection_manager.get_active_sessions(),
            "online_users": self._connection_manager.get_online_users()
        }