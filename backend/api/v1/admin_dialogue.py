"""
Admin dialogue management API endpoints
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload
import json
import csv
import io
import asyncio
from uuid import UUID

from backend.config.database import get_db
from backend.core.auth import require_admin
from backend.models.user import User
from backend.models.dialogue import (
    DialogueSession, DialogueMessage, DialogueStatus,
    MessageRole, DialogueContext, AIUsageTracking
)
from backend.models.book import Book
from backend.schemas.admin_dialogue import (
    AdminDialogueListResponse,
    AdminDialogueDetailResponse,
    AdminDialogueMessageResponse,
    AdminDialogueStatsResponse,
    AdminInterventionRequest,
    AdminMessageUpdateRequest,
    AdminDialogueExportRequest,
    AdminDialogueFilterParams,
    AdminRealtimeMessage
)
from backend.core.logger import logger
from backend.services.websocket_manager import WebSocketManager

router = APIRouter(prefix="/admin/dialogues", tags=["Admin - Dialogues"])
ws_manager = WebSocketManager()


@router.get("/", response_model=AdminDialogueListResponse)
async def get_dialogue_list(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_filter: Optional[str] = None,
    flagged_only: bool = False,
    user_id: Optional[UUID] = None,
    book_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get list of dialogues with filters"""
    try:
        # 构建查询
        query = select(DialogueSession).options(
            selectinload(DialogueSession.messages)
        )

        # 应用过滤器
        if status_filter and status_filter != 'all':
            query = query.where(DialogueSession.status == status_filter)

        if user_id:
            query = query.where(DialogueSession.user_id == user_id)

        if book_id:
            query = query.where(DialogueSession.book_id == book_id)

        # 日期过滤
        if date_filter:
            now = datetime.utcnow()
            if date_filter == 'today':
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.where(DialogueSession.created_at >= start_date)
            elif date_filter == 'week':
                start_date = now - timedelta(days=7)
                query = query.where(DialogueSession.created_at >= start_date)
            elif date_filter == 'month':
                start_date = now - timedelta(days=30)
                query = query.where(DialogueSession.created_at >= start_date)

        # 搜索功能 - 需要join用户和书籍表
        if search:
            # 这里简化处理，实际应该join相关表进行搜索
            pass

        # 标记过滤
        if flagged_only:
            # 需要在消息中查找被标记的对话
            subquery = select(DialogueMessage.session_id).where(
                DialogueMessage.is_reported == True
            ).distinct()
            query = query.where(DialogueSession.id.in_(subquery))

        # 排序
        query = query.order_by(desc(DialogueSession.created_at))

        # 计算总数
        count_query = select(func.count()).select_from(DialogueSession)
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()

        # 分页
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)

        # 执行查询
        result = await db.execute(query)
        dialogues = result.scalars().all()

        # 构建响应
        items = []
        for dialogue in dialogues:
            # 获取用户和书籍信息
            user_result = await db.execute(
                select(User).where(User.id == dialogue.user_id)
            )
            user = user_result.scalar_one_or_none()

            book_result = await db.execute(
                select(Book).where(Book.id == dialogue.book_id)
            )
            book = book_result.scalar_one_or_none()

            # 获取最后消息时间
            last_message = max(dialogue.messages, key=lambda m: m.created_at) if dialogue.messages else None

            # 检查是否有标记的消息
            is_flagged = any(msg.is_reported for msg in dialogue.messages)

            items.append({
                "id": str(dialogue.id),
                "user": {
                    "id": str(user.id) if user else "",
                    "nickname": user.nickname if user else "Unknown",
                    "avatar_url": user.avatar_url if user else None
                },
                "book": {
                    "id": str(book.id) if book else "",
                    "title": book.title if book else "Unknown"
                },
                "status": dialogue.status,
                "message_count": dialogue.message_count,
                "created_at": dialogue.created_at.isoformat(),
                "ended_at": dialogue.ended_at.isoformat() if dialogue.ended_at else None,
                "last_message_at": last_message.created_at.isoformat() if last_message else None,
                "is_flagged": is_flagged,
                "total_tokens": dialogue.total_input_tokens + dialogue.total_output_tokens
            })

        return {
            "items": items,
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page
        }

    except Exception as e:
        logger.error(f"Failed to get dialogue list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{dialogue_id}", response_model=AdminDialogueDetailResponse)
async def get_dialogue_detail(
    dialogue_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get detailed dialogue information"""
    try:
        # 获取对话会话
        result = await db.execute(
            select(DialogueSession).options(
                selectinload(DialogueSession.messages)
            ).where(DialogueSession.id == dialogue_id)
        )
        dialogue = result.scalar_one_or_none()

        if not dialogue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue not found"
            )

        # 获取用户信息
        user_result = await db.execute(
            select(User).where(User.id == dialogue.user_id)
        )
        user = user_result.scalar_one_or_none()

        # 获取书籍信息
        book_result = await db.execute(
            select(Book).where(Book.id == dialogue.book_id)
        )
        book = book_result.scalar_one_or_none()

        # 计算指标
        response_times = [msg.response_time_ms for msg in dialogue.messages
                         if msg.response_time_ms and msg.role == MessageRole.ASSISTANT]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        confidence_scores = [msg.confidence_score for msg in dialogue.messages
                            if msg.confidence_score is not None]
        ai_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0

        # 构建消息列表
        messages = []
        for msg in sorted(dialogue.messages, key=lambda m: m.created_at):
            references = []
            if msg.reference_type and msg.reference_text:
                references.append({
                    "type": msg.reference_type,
                    "text": msg.reference_text,
                    "location": msg.reference_metadata.get("location") if msg.reference_metadata else None
                })

            messages.append({
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "tokens_used": msg.tokens_used,
                "response_time_ms": msg.response_time_ms,
                "is_flagged": msg.is_reported,
                "is_hidden": False,  # 可以添加隐藏字段
                "references": references
            })

        return {
            "id": str(dialogue.id),
            "user": {
                "id": str(user.id) if user else "",
                "nickname": user.nickname if user else "Unknown",
                "email": user.email if user else "",
                "avatar_url": user.avatar_url if user else None
            },
            "book": {
                "id": str(book.id) if book else "",
                "title": book.title if book else "Unknown",
                "author": book.author if book else "",
                "cover_url": book.cover_url if book else None
            },
            "status": dialogue.status,
            "created_at": dialogue.created_at.isoformat(),
            "ended_at": dialogue.ended_at.isoformat() if dialogue.ended_at else None,
            "message_count": dialogue.message_count,
            "total_tokens": dialogue.total_input_tokens + dialogue.total_output_tokens,
            "total_cost": dialogue.total_cost,
            "messages": messages,
            "metrics": {
                "avg_response_time": avg_response_time,
                "ai_confidence": ai_confidence,
                "user_satisfaction": None,  # 需要从用户反馈计算
                "sentiment_score": None  # 需要情感分析
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dialogue detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{dialogue_id}/messages/{message_id}")
async def delete_message(
    dialogue_id: UUID,
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a specific message from dialogue"""
    try:
        # 获取消息
        result = await db.execute(
            select(DialogueMessage).where(
                and_(
                    DialogueMessage.id == message_id,
                    DialogueMessage.session_id == dialogue_id
                )
            )
        )
        message = result.scalar_one_or_none()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        # 删除消息
        await db.delete(message)
        await db.commit()

        return {"success": True, "message": "Message deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete message: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{dialogue_id}/intervene")
async def intervene_dialogue(
    dialogue_id: UUID,
    request: AdminInterventionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin intervention in active dialogue"""
    try:
        # 获取对话
        result = await db.execute(
            select(DialogueSession).where(DialogueSession.id == dialogue_id)
        )
        dialogue = result.scalar_one_or_none()

        if not dialogue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue not found"
            )

        if dialogue.status != DialogueStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only intervene in active dialogues"
            )

        # 创建系统消息
        system_message = DialogueMessage(
            session_id=dialogue_id,
            role=MessageRole.SYSTEM,
            content=f"[管理员消息] {request.message}",
            content_type="text",
            model_used="admin_intervention",
            created_at=datetime.utcnow()
        )

        db.add(system_message)
        dialogue.message_count += 1
        dialogue.last_message_at = datetime.utcnow()

        await db.commit()

        # 通过WebSocket通知用户
        await ws_manager.send_to_session(
            str(dialogue_id),
            {
                "type": "admin_intervention",
                "message": request.message,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        return {"success": True, "message": "Intervention successful"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to intervene: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{dialogue_id}/end")
async def end_dialogue(
    dialogue_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Force end an active dialogue"""
    try:
        # 获取对话
        result = await db.execute(
            select(DialogueSession).where(DialogueSession.id == dialogue_id)
        )
        dialogue = result.scalar_one_or_none()

        if not dialogue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue not found"
            )

        if dialogue.status != DialogueStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dialogue is not active"
            )

        # 结束对话
        dialogue.status = DialogueStatus.ENDED
        dialogue.ended_at = datetime.utcnow()

        await db.commit()

        # 通过WebSocket通知用户
        await ws_manager.send_to_session(
            str(dialogue_id),
            {
                "type": "session_ended",
                "reason": "Admin terminated",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        return {"success": True, "message": "Dialogue ended"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end dialogue: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.websocket("/realtime")
async def realtime_monitoring(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time dialogue monitoring"""
    await websocket.accept()
    connection_id = await ws_manager.connect(websocket, "admin")

    try:
        # 发送初始数据
        active_sessions = await get_active_sessions(db)
        await websocket.send_json({
            "type": "initial_data",
            "active_sessions": active_sessions
        })

        # 保持连接并发送实时更新
        while True:
            # 接收客户端消息（心跳等）
            data = await websocket.receive_text()

            # 可以处理特定命令
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(connection_id)


@router.get("/stats/overview", response_model=AdminDialogueStatsResponse)
async def get_dialogue_stats(
    date_range: Optional[str] = Query("week", pattern="^(today|week|month|year)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get dialogue statistics"""
    try:
        now = datetime.utcnow()

        # 确定日期范围
        if date_range == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_range == "week":
            start_date = now - timedelta(days=7)
        elif date_range == "month":
            start_date = now - timedelta(days=30)
        else:  # year
            start_date = now - timedelta(days=365)

        # 获取总会话数
        total_result = await db.execute(
            select(func.count(DialogueSession.id))
        )
        total_sessions = total_result.scalar() or 0

        # 获取活跃会话数
        active_result = await db.execute(
            select(func.count(DialogueSession.id)).where(
                DialogueSession.status == DialogueStatus.ACTIVE
            )
        )
        active_sessions = active_result.scalar() or 0

        # 获取指定时间范围内的会话数
        period_result = await db.execute(
            select(func.count(DialogueSession.id)).where(
                DialogueSession.created_at >= start_date
            )
        )
        period_sessions = period_result.scalar() or 0

        # 获取平均响应时间
        response_time_result = await db.execute(
            select(func.avg(DialogueMessage.response_time_ms)).where(
                and_(
                    DialogueMessage.role == MessageRole.ASSISTANT,
                    DialogueMessage.response_time_ms.isnot(None)
                )
            )
        )
        avg_response_time = response_time_result.scalar() or 0

        # 获取总消息数
        messages_result = await db.execute(
            select(func.count(DialogueMessage.id))
        )
        total_messages = messages_result.scalar() or 0

        # 计算用户满意度（基于点赞）
        liked_result = await db.execute(
            select(func.count(DialogueMessage.id)).where(
                DialogueMessage.is_liked == True
            )
        )
        liked_count = liked_result.scalar() or 0

        rated_result = await db.execute(
            select(func.count(DialogueMessage.id)).where(
                DialogueMessage.is_liked.isnot(None)
            )
        )
        rated_count = rated_result.scalar() or 0

        user_satisfaction = (liked_count / rated_count) if rated_count > 0 else 0

        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "period_sessions": period_sessions,
            "avg_response_time": avg_response_time,
            "total_messages": total_messages,
            "user_satisfaction": user_satisfaction,
            "date_range": date_range
        }

    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/export")
async def export_dialogues(
    request: AdminDialogueExportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Export dialogue data"""
    try:
        # 构建查询
        query = select(DialogueSession).options(
            selectinload(DialogueSession.messages)
        )

        # 应用过滤器
        if request.dialogue_ids:
            query = query.where(DialogueSession.id.in_(request.dialogue_ids))

        if request.date_from:
            query = query.where(DialogueSession.created_at >= request.date_from)

        if request.date_to:
            query = query.where(DialogueSession.created_at <= request.date_to)

        # 执行查询
        result = await db.execute(query)
        dialogues = result.scalars().all()

        # 根据格式导出
        if request.format == "json":
            # JSON格式导出
            data = []
            for dialogue in dialogues:
                messages = [
                    {
                        "role": msg.role,
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat()
                    }
                    for msg in sorted(dialogue.messages, key=lambda m: m.created_at)
                ]

                data.append({
                    "id": str(dialogue.id),
                    "user_id": str(dialogue.user_id),
                    "book_id": str(dialogue.book_id),
                    "status": dialogue.status,
                    "created_at": dialogue.created_at.isoformat(),
                    "messages": messages
                })

            return StreamingResponse(
                io.StringIO(json.dumps(data, ensure_ascii=False, indent=2)),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=dialogues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )

        else:  # CSV格式
            output = io.StringIO()
            writer = csv.writer(output)

            # 写入表头
            writer.writerow([
                "Dialogue ID", "User ID", "Book ID", "Status",
                "Created At", "Message Count", "Total Tokens"
            ])

            # 写入数据
            for dialogue in dialogues:
                writer.writerow([
                    str(dialogue.id),
                    str(dialogue.user_id),
                    str(dialogue.book_id),
                    dialogue.status,
                    dialogue.created_at.isoformat(),
                    dialogue.message_count,
                    dialogue.total_input_tokens + dialogue.total_output_tokens
                ])

            output.seek(0)
            return StreamingResponse(
                output,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=dialogues_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )

    except Exception as e:
        logger.error(f"Failed to export dialogues: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


async def get_active_sessions(db: AsyncSession) -> List[Dict]:
    """Get list of active sessions for real-time monitoring"""
    result = await db.execute(
        select(DialogueSession).where(
            DialogueSession.status == DialogueStatus.ACTIVE
        ).order_by(desc(DialogueSession.last_message_at))
    )
    sessions = result.scalars().all()

    active_list = []
    for session in sessions:
        # 获取用户信息
        user_result = await db.execute(
            select(User).where(User.id == session.user_id)
        )
        user = user_result.scalar_one_or_none()

        # 获取书籍信息
        book_result = await db.execute(
            select(Book).where(Book.id == session.book_id)
        )
        book = book_result.scalar_one_or_none()

        active_list.append({
            "id": str(session.id),
            "user": {
                "id": str(user.id) if user else "",
                "nickname": user.nickname if user else "Unknown"
            },
            "book": {
                "title": book.title if book else "Unknown"
            },
            "start_time": session.created_at.isoformat(),
            "message_count": session.message_count,
            "last_activity": session.last_message_at.isoformat() if session.last_message_at else session.created_at.isoformat(),
            "status": "active"
        })

    return active_list