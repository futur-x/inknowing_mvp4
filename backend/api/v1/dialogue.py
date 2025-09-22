"""
Dialogue API endpoints
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from config.database import get_db
from core.auth import get_current_user
from models.user import User
from models.dialogue import DialogueSession, DialogueMessage, DialogueStatus
from schemas.dialogue import (
    DialogueSessionCreate,
    CharacterDialogueSessionCreate,
    DialogueMessageCreate,
    DialogueSessionResponse,
    DialogueMessageResponse,
    DialogueContextResponse,
    DialogueHistoryQuery,
    WSUserMessage,
    WSAssistantMessage,
    WSTypingIndicator,
    WSError,
)
from services.dialogue import dialogue_service
from services.ai_model import ai_service
from core.logger import logger


router = APIRouter(prefix="/dialogues", tags=["Dialogues"])


@router.post("/book/start", response_model=DialogueSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_book_dialogue(
    data: DialogueSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a dialogue session with a book"""
    try:
        return await dialogue_service.create_book_dialogue(
            db=db,
            user_id=current_user.id,
            data=data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start book dialogue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start dialogue: {str(e)}"
        )


@router.post("/character/start", response_model=DialogueSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_character_dialogue(
    data: CharacterDialogueSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a dialogue session with a book character"""
    try:
        return await dialogue_service.create_character_dialogue(
            db=db,
            user_id=current_user.id,
            data=data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start character dialogue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start dialogue: {str(e)}"
        )


@router.post("/{session_id}/messages", response_model=DialogueMessageResponse)
async def send_dialogue_message(
    session_id: str,
    message: DialogueMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message in an active dialogue session"""
    try:
        return await dialogue_service.send_message(
            db=db,
            session_id=session_id,
            user_id=current_user.id,
            message=message
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/{session_id}/messages")
async def get_dialogue_messages(
    session_id: str,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get message history for a dialogue session"""
    try:
        return await dialogue_service.get_session_messages(
            db=db,
            session_id=session_id,
            user_id=current_user.id,
            page=page,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )


@router.get("/{session_id}/context", response_model=DialogueContextResponse)
async def get_dialogue_context(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current context and references for dialogue session"""
    try:
        # Verify session ownership
        session = await db.get(DialogueSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue session not found"
            )

        # Get context
        from models.dialogue import DialogueContext
        stmt = select(DialogueContext).where(
            DialogueContext.session_id == session_id
        )
        result = await db.execute(stmt)
        context = result.scalar_one_or_none()

        if not context:
            # Return empty context
            return DialogueContextResponse(
                session_id=session_id,
                book_context={
                    "current_chapter": None,
                    "discussed_topics": [],
                    "key_references": []
                },
                character_context=None
            )

        # Build response
        book_context = {
            "current_chapter": context.current_chapter,
            "discussed_topics": list(context.chapter_summaries.keys()) if context.chapter_summaries else [],
            "key_references": []
        }

        character_context = None
        # if session.character_id:
        #     character_context = {
        #         "character_state": session.character_state,
        #         "emotional_tone": context.emotional_state,
        #         "remembered_facts": context.character_memories
        #     }

        return DialogueContextResponse(
            session_id=session_id,
            book_context=book_context,
            character_context=character_context
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dialogue context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get context: {str(e)}"
        )


@router.get("/history")
async def get_dialogue_history(
    book_id: str = None,
    type: str = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all dialogue sessions for current user"""
    try:
        # Build query
        stmt = select(DialogueSession).where(
            DialogueSession.user_id == current_user.id
        )

        if book_id:
            stmt = stmt.where(DialogueSession.book_id == book_id)

        if type:
            stmt = stmt.where(DialogueSession.type == type)

        # Add pagination
        offset = (page - 1) * limit
        stmt = stmt.order_by(desc(DialogueSession.last_message_at))
        stmt = stmt.offset(offset).limit(limit)

        result = await db.execute(stmt)
        sessions = result.scalars().all()

        # Get total count
        count_stmt = select(func.count()).select_from(DialogueSession).where(
            DialogueSession.user_id == current_user.id
        )
        if book_id:
            count_stmt = count_stmt.where(DialogueSession.book_id == book_id)
        if type:
            count_stmt = count_stmt.where(DialogueSession.type == type)

        total = await db.scalar(count_stmt)

        # Convert to response format
        session_responses = []
        for session in sessions:
            # Get book title
            from models.book import Book
            book = await db.get(Book, session.book_id)

            # Get character name if character dialogue
            character_name = None
            # if session.character_id:
            #     from models.book import BookCharacter
            #     character = await db.get(BookCharacter, session.character_id)
            #     character_name = character.name if character else None

            session_responses.append(DialogueSessionResponse(
                id=str(session.id),
                book_id=str(session.book_id),
                book_title=book.title if book else "Unknown",
                type=session.type,  # Already a string
                character_id=None,  # Field removed from model
                character_name=character_name,
                user_id=str(session.user_id),
                message_count=session.message_count,
                last_message_at=session.last_message_at,
                created_at=session.created_at,
                status=session.status  # Already a string
            ))

        return {
            "sessions": session_responses,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0,
                "has_next": page * limit < total,
                "has_prev": page > 1
            }
        }

    except Exception as e:
        logger.error(f"Failed to get dialogue history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}"
        )


@router.post("/{session_id}/end")
async def end_dialogue_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End a dialogue session"""
    try:
        # Get session
        session = await db.get(DialogueSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue session not found"
            )

        # Update status
        from datetime import datetime
        session.status = DialogueStatus.ENDED
        session.ended_at = datetime.utcnow()

        await db.commit()

        return {"message": "Dialogue session ended"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end dialogue session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )


# WebSocket endpoint for real-time dialogue
@router.websocket("/ws/{session_id}")
async def dialogue_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = None  # Token from query parameter
):
    """WebSocket connection for real-time dialogue"""
    # Extract token from query parameters if not provided
    if not token:
        token = websocket.query_params.get("token")

    await websocket.accept()

    try:
        # Verify token and get user
        from core.security import verify_token

        if not token:
            logger.warning(f"WebSocket connection attempt without token for session {session_id}")
            await websocket.send_json(WSError(message="Token required").dict())
            await websocket.close(code=1008)
            return

        logger.debug(f"Verifying token for WebSocket connection to session {session_id}")
        payload = verify_token(token)
        if not payload:
            logger.warning(f"Invalid token for WebSocket connection to session {session_id}")
            await websocket.send_json(WSError(message="Invalid token").dict())
            await websocket.close(code=1008)
            return

        user_id = payload.get("sub")
        logger.info(f"User {user_id} connected to WebSocket for session {session_id}")

        # Get database session
        async for db in get_db():
            # Verify session ownership
            logger.debug(f"Verifying session {session_id} ownership for user {user_id}")
            session = await db.get(DialogueSession, session_id)

            if not session:
                logger.warning(f"Session {session_id} not found in database")
                await websocket.send_json(WSError(message="Session not found").dict())
                await websocket.close(code=1008)
                return

            if str(session.user_id) != str(user_id):
                logger.warning(f"Session {session_id} belongs to user {session.user_id}, not {user_id}")
                await websocket.send_json(WSError(message="Session access denied").dict())
                await websocket.close(code=1008)
                return

            logger.info(f"Session {session_id} verified for user {user_id}")

            # Handle messages
            while True:
                # Receive message from client
                data = await websocket.receive_json()

                if data.get("type") == "message":
                    # Extract the frontend message ID for response correlation
                    frontend_message_id = data.get("messageId")

                    # Send typing indicator
                    await websocket.send_json(
                        WSTypingIndicator(isTyping=True).dict()
                    )

                    try:
                        # Process message
                        response = await dialogue_service.send_message(
                            db=db,
                            session_id=session_id,
                            user_id=user_id,
                            message=DialogueMessageCreate(message=data.get("content"))
                        )

                        # Send AI response in correct format for frontend
                        # Use the frontend's messageId for proper correlation
                        await websocket.send_json({
                            "type": "ai_response",
                            "content": response.content,
                            "messageId": frontend_message_id or response.id,  # Prefer frontend ID for correlation
                            "timestamp": response.timestamp.isoformat() if hasattr(response.timestamp, 'isoformat') else response.timestamp,
                            "metadata": {
                                "references": response.references if response.references else [],
                                "tokensUsed": response.tokens_used,
                                "modelUsed": response.model_used,
                                "dbMessageId": response.id  # Keep DB ID for reference
                            }
                        })
                    except Exception as e:
                        await websocket.send_json(
                            WSError(message=str(e)).dict()
                        )
                    finally:
                        # Stop typing indicator
                        await websocket.send_json(
                            WSTypingIndicator(isTyping=False).dict()
                        )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}", exc_info=True)
        try:
            await websocket.send_json(WSError(message=f"Server error: {str(e)}").dict())
            await websocket.close(code=1011)  # Internal server error
        except:
            pass  # Connection might already be closed


@router.post("/{session_id}/stream")
async def stream_dialogue_response(
    session_id: str,
    message: DialogueMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream dialogue response using Server-Sent Events"""
    try:
        # Verify session ownership
        session = await db.get(DialogueSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dialogue session not found"
            )

        async def generate():
            try:
                # Save user message
                from models.dialogue import DialogueMessage, MessageRole
                user_msg = DialogueMessage(
                    session_id=session_id,
                    role=MessageRole.USER,
                    content=message.message,
                    model_used="user"
                )
                db.add(user_msg)
                await db.commit()

                # Get context
                context = await dialogue_service._get_dialogue_context(db, session)

                # Prepare messages
                if session.type == "book":
                    messages = await dialogue_service._prepare_book_dialogue_messages(
                        message.message, context
                    )
                else:
                    messages = await dialogue_service._prepare_character_dialogue_messages(
                        message.message, context
                    )

                # Initialize AI service if needed
                if not ai_service.providers:
                    await ai_service.initialize(db)

                # Stream response
                response = await ai_service.chat_completion(
                    messages=messages,
                    user_id=current_user.id,
                    session_id=session_id,
                    feature="dialogue",
                    stream=True
                )

                # Stream chunks
                full_response = ""
                async for chunk in response["stream"]:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {content}\n\n"

                # Save complete response
                ai_msg = DialogueMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=full_response,
                    model_used="gpt-4"  # Should be from actual model
                )
                db.add(ai_msg)

                # Update session
                session.message_count += 2
                from datetime import datetime
                session.last_message_at = datetime.utcnow()

                await db.commit()

                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"Stream error: {e}")
                yield f"data: ERROR: {str(e)}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"  # Disable Nginx buffering
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stream response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stream: {str(e)}"
        )