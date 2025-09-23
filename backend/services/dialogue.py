"""
Dialogue Service - Manages book and character dialogues
"""
import json
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
from uuid import uuid4, UUID

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from backend.models.user import User, UserQuota, MembershipType
from backend.models.book import Book, BookCharacter
from backend.models.dialogue import (
    DialogueSession,
    DialogueMessage,
    DialogueContext,
    PromptTemplate,
    MessageRole,
    DialogueType,
    DialogueStatus,
)
from backend.schemas.dialogue import (
    DialogueSessionCreate,
    CharacterDialogueSessionCreate,
    DialogueMessageCreate,
    DialogueSessionResponse,
    DialogueMessageResponse,
    DialogueContextResponse,
)
from backend.schemas.ai_model import VectorSearchQuery
from backend.services.ai_litellm import ai_service  # Use simplified LiteLLM service
from backend.services.vector_db import vector_service
from backend.services.user import check_user_quota
from backend.core.logger import logger


class DialogueService:
    """Service for managing dialogues"""

    async def create_book_dialogue(
        self,
        db: AsyncSession,
        user_id: str,
        data: DialogueSessionCreate
    ) -> DialogueSessionResponse:
        """Create a new book dialogue session"""
        try:
            # Check user quota
            has_quota = await check_user_quota(db, user_id)
            if not has_quota:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Dialogue quota exceeded"
                )

            # Get book by book_id string
            stmt = select(Book).where(Book.book_id == data.book_id)
            result = await db.execute(stmt)
            book = result.scalar_one_or_none()
            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Create dialogue session (use book.id UUID, not book_id string)
            session = DialogueSession(
                user_id=UUID(user_id) if isinstance(user_id, str) else user_id,
                book_id=book.id,  # Use the UUID object directly
                type="book",  # Use lowercase string value
                initial_question=data.initial_question,
                status="active"  # Use lowercase string value
            )

            db.add(session)
            await db.commit()
            await db.refresh(session)

            # If initial question provided, process it
            if data.initial_question:
                await self.send_message(
                    db=db,
                    session_id=session.id,
                    user_id=user_id,
                    message=DialogueMessageCreate(message=data.initial_question)
                )

            return DialogueSessionResponse(
                id=str(session.id),
                book_id=book.book_id,  # Return the string book_id for API
                book_title=book.title,
                type="book",
                character_id=None,
                character_name=None,
                user_id=str(session.user_id),
                message_count=session.message_count,
                last_message_at=session.last_message_at,
                created_at=session.created_at,
                status=session.status  # Already a string
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create book dialogue: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create dialogue: {str(e)}"
            )

    async def create_character_dialogue(
        self,
        db: AsyncSession,
        user_id: str,
        data: CharacterDialogueSessionCreate
    ) -> DialogueSessionResponse:
        """Create a new character dialogue session"""
        try:
            # Check user quota
            has_quota = await check_user_quota(db, user_id)
            if not has_quota:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Dialogue quota exceeded"
                )

            # Get book by book_id string
            stmt = select(Book).where(Book.book_id == data.book_id)
            result = await db.execute(stmt)
            book = result.scalar_one_or_none()
            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Book not found"
                )

            # Get character by character_id string
            stmt = select(BookCharacter).where(BookCharacter.character_id == data.character_id)
            result = await db.execute(stmt)
            character = result.scalar_one_or_none()
            if not character or character.book_id != book.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Character not found"
                )

            # Create dialogue session (use UUIDs from database objects)
            session = DialogueSession(
                user_id=UUID(user_id) if isinstance(user_id, str) else user_id,
                book_id=book.id,  # Use the UUID object directly
                type="character",  # Use lowercase string value
                # character_id=character.id,  # Commented out - field doesn't exist yet
                initial_question=data.initial_message,
                status="active"  # Use lowercase string value
            )

            db.add(session)
            await db.commit()
            await db.refresh(session)

            # If initial message provided, process it
            if data.initial_message:
                await self.send_message(
                    db=db,
                    session_id=session.id,
                    user_id=user_id,
                    message=DialogueMessageCreate(message=data.initial_message)
                )

            return DialogueSessionResponse(
                id=str(session.id),
                book_id=book.book_id,  # Return the string book_id for API
                book_title=book.title,
                type="character",
                character_id=character.character_id,  # Return the string character_id for API
                character_name=character.name,
                user_id=str(session.user_id),
                message_count=session.message_count,
                last_message_at=session.last_message_at,
                created_at=session.created_at,
                status=session.status  # Already a string
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create character dialogue: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create dialogue: {str(e)}"
            )

    async def send_message(
        self,
        db: AsyncSession,
        session_id: str,
        user_id: str,
        message: DialogueMessageCreate
    ) -> DialogueMessageResponse:
        """Send a message in a dialogue session"""
        try:
            # Get session
            session = await db.get(DialogueSession, session_id)
            if not session or str(session.user_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dialogue session not found"
                )

            if session.status != "active":  # Use lowercase string value
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Dialogue session is not active"
                )

            # Check user quota
            has_quota = await check_user_quota(db, user_id)
            if not has_quota:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Dialogue quota exceeded"
                )

            # Save user message
            logger.info(f"Creating user message for session {session_id}")
            user_msg = DialogueMessage(
                session_id=UUID(session_id) if isinstance(session_id, str) else session_id,
                message_id=str(uuid4()),
                role="user",  # Use lowercase string value
                content=message.message,
                content_type="text",
                model_used="user",
                tokens_used=0
            )
            db.add(user_msg)

            # Flush to check for errors before continuing
            try:
                await db.flush()
                logger.info("User message saved successfully")
            except Exception as e:
                logger.error(f"Failed to save user message: {e}")
                logger.error(f"User message data: session_id={session_id}, role=user, content={message.message[:50]}...")
                raise

            # Get context
            logger.info("Getting dialogue context")
            context = await self._get_dialogue_context(db, session)

            # Generate AI response
            logger.info("Generating AI response")
            ai_response = await self._generate_response(
                db=db,
                session=session,
                user_message=message.message,
                context=context
            )
            logger.info(f"AI response generated: {len(ai_response.get('content', ''))} chars")

            # Save AI message
            logger.info("Creating AI message")

            # Extract first reference if available
            references = ai_response.get("references", [])
            reference = references[0] if references else None

            ai_msg = DialogueMessage(
                session_id=UUID(session_id) if isinstance(session_id, str) else session_id,
                message_id=str(uuid4()),
                role="assistant",  # Use lowercase string value
                content=ai_response["content"],
                content_type="text",
                reference_type=reference.get("type") if reference else None,
                reference_id=reference.get("id") if reference else None,
                reference_text=reference.get("text") if reference else None,
                reference_metadata=references if references else None,  # Store all references as metadata
                model_used=ai_response["model"],
                tokens_used=ai_response["usage"]["input_tokens"] + ai_response["usage"]["output_tokens"],
                response_time_ms=ai_response.get("latency_ms")
            )
            db.add(ai_msg)

            # Update session
            session.message_count += 2
            session.last_message_at = datetime.utcnow()
            session.total_input_tokens += ai_response["usage"]["input_tokens"]
            session.total_output_tokens += ai_response["usage"]["output_tokens"]
            session.total_cost += ai_response["usage"]["cost"]

            # Update user quota
            await self._update_user_quota(db, user_id)

            await db.commit()
            await db.refresh(ai_msg)

            # Reconstruct references for response
            response_references = ai_msg.reference_metadata if ai_msg.reference_metadata else []

            return DialogueMessageResponse(
                id=str(ai_msg.id),  # Convert UUID to string
                session_id=str(ai_msg.session_id),  # Convert UUID to string
                role=ai_msg.role,  # Already a string
                content=ai_msg.content,
                references=response_references,
                timestamp=ai_msg.created_at,
                tokens_used=ai_msg.tokens_used or 0,
                model_used=ai_msg.model_used
            )

        except HTTPException:
            await db.rollback()  # Rollback on HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            await db.rollback()  # Rollback on any other exceptions
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send message: {str(e)}"
            )

    async def _get_dialogue_context(
        self,
        db: AsyncSession,
        session: DialogueSession
    ) -> Dict[str, Any]:
        """Get context for dialogue"""
        try:
            context = {}

            # Get recent messages
            stmt = select(DialogueMessage).where(
                DialogueMessage.session_id == session.id
            ).order_by(desc(DialogueMessage.created_at)).limit(10)

            result = await db.execute(stmt)
            recent_messages = result.scalars().all()

            # Build conversation history
            conversation = []
            for msg in reversed(recent_messages):
                conversation.append({
                    "role": msg.role,  # Already a string
                    "content": msg.content
                })

            context["conversation"] = conversation

            # Get book information (session.book_id is UUID)
            book = await db.get(Book, session.book_id)
            if book:
                context["book"] = {
                    "title": book.title,
                    "author": book.author,
                    "description": book.description or "",
                    "category": book.category or ""
                }
            else:
                # Fallback if book not found
                context["book"] = {
                    "title": "Unknown Book",
                    "author": "Unknown Author",
                    "description": "",
                    "category": ""
                }

            # For character dialogues, get character information
            # Note: character_id field doesn't exist in DialogueSession yet
            # This is placeholder for future implementation
            if session.type == "character":  # Use string comparison
                # TODO: Add character_id field to DialogueSession model
                # For now, we'll skip character-specific context
                pass

            # Get stored context if exists
            stmt = select(DialogueContext).where(
                DialogueContext.session_id == session.id
            )
            result = await db.execute(stmt)
            stored_context = result.scalar_one_or_none()

            if stored_context:
                context["stored"] = {
                    "context_messages": stored_context.context_messages,
                    "conversation_summary": stored_context.conversation_summary,
                    "key_topics": stored_context.key_topics,
                    "key_entities": stored_context.key_entities
                }

            # Build context string
            context_parts = [f"Book: {context['book']['title']} by {context['book']['author']}"]

            if session.type == "character":  # Use string comparison
                if "character" in context:
                    context_parts.append(f"Character: {context['character']['name']}")

            if conversation:
                context_parts.append("Recent conversation:")
                for msg in conversation[-5:]:  # Last 5 messages
                    role = "User" if msg["role"] == "user" else "Assistant"
                    context_parts.append(f"{role}: {msg['content'][:100]}...")

            context["context_string"] = "\n".join(context_parts)

            return context

        except Exception as e:
            logger.error(f"Failed to get dialogue context: {e}")
            return {}

    async def _generate_response(
        self,
        db: AsyncSession,
        session: DialogueSession,
        user_message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate AI response for dialogue"""
        try:
            # Prepare messages based on dialogue type
            if session.type == "book":  # Use string comparison
                messages = await self._prepare_book_dialogue_messages(
                    user_message, context
                )
            else:
                messages = await self._prepare_character_dialogue_messages(
                    user_message, context
                )

            # Search for relevant content if book is vectorized
            search_results = []
            book = await db.get(Book, session.book_id)

            if book.type == "vectorized":
                search_query = VectorSearchQuery(
                    query=user_message,
                    book_id=book.book_id,  # Use the string book_id for vector search
                    top_k=5,
                    threshold=0.7
                )

                search_results = await vector_service.search(search_query)

                # Add search results to context
                if search_results:
                    context_addition = "\n\nRelevant content from the book:\n"
                    for result in search_results[:3]:
                        context_addition += f"- {result.content[:200]}...\n"

                    messages[0]["content"] += context_addition

            # Generate response
            import time
            start_time = time.time()

            response = await ai_service.chat_completion(
                messages=messages,
                user_id=str(session.user_id),  # Convert UUID to string
                session_id=str(session.id),  # Convert UUID to string
                feature="dialogue" if session.type == "book" else "character_dialogue",
                temperature=0.7 if session.type == "book" else 0.9
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Calculate cost
            cost = ai_service._calculate_cost(
                response["usage"]["input_tokens"],
                response["usage"]["output_tokens"],
                "openai",  # Default, should be from actual provider
                response["model"]
            )

            return {
                "content": response["content"],
                "references": self._extract_references(search_results),
                "search_results": [r.dict() for r in search_results] if search_results else None,
                "model": response["model"],
                "parameters": {"temperature": 0.7},
                "usage": {
                    "input_tokens": response["usage"]["input_tokens"],
                    "output_tokens": response["usage"]["output_tokens"],
                    "cost": cost
                },
                "latency_ms": latency_ms
            }

        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            # Return a fallback response
            return {
                "content": "I apologize, but I'm having trouble generating a response right now. Please try again.",
                "references": [],
                "model": "fallback",
                "usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "cost": 0
                }
            }

    async def _prepare_book_dialogue_messages(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Prepare messages for book dialogue"""
        system_prompt = f"""You are an AI assistant helping users understand and discuss the book "{context['book']['title']}" by {context['book']['author']}.

Book Description: {context['book']['description']}
Category: {context['book']['category']}

Your role is to:
1. Answer questions about the book's content, themes, and characters
2. Provide insightful analysis and interpretations
3. Help users understand complex concepts
4. Draw connections between different parts of the book
5. Relate the book's content to real-world applications

Be knowledgeable, helpful, and engaging. If you're not certain about specific details, acknowledge this honestly."""

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history
        if "conversation" in context:
            for msg in context["conversation"][-5:]:  # Last 5 messages
                if msg["role"] != "system":
                    messages.append(msg)

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        return messages

    async def _prepare_character_dialogue_messages(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Prepare messages for character dialogue"""
        character = context.get("character", {})

        system_prompt = f"""You are roleplaying as {character.get('name')} from the book "{context['book']['title']}" by {context['book']['author']}.

Character Description: {character.get('description')}
Personality: {character.get('personality')}

{character.get('personality_prompt', '')}

Stay in character at all times. Respond as {character.get('name')} would, considering their personality, background, and experiences from the book. Make the conversation immersive and authentic to the character."""

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Add conversation history
        if "conversation" in context:
            for msg in context["conversation"][-5:]:  # Last 5 messages
                if msg["role"] != "system":
                    messages.append(msg)

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        return messages

    def _extract_references(
        self,
        search_results: List[Any]
    ) -> List[Dict[str, Any]]:
        """Extract references from search results"""
        references = []

        for result in search_results[:3]:  # Top 3 results
            references.append({
                "type": "paragraph",
                "chapter": result.metadata.get("chapter_number"),
                "text": result.content[:200] + "...",
                "highlight": None
            })

        return references

    async def _update_user_quota(
        self,
        db: AsyncSession,
        user_id: str
    ):
        """Update user quota after message"""
        try:
            stmt = select(UserQuota).where(UserQuota.user_id == user_id)
            result = await db.execute(stmt)
            quota = result.scalar_one_or_none()

            if quota:
                quota.used_quota += 1
            else:
                # Create quota record
                user = await db.get(User, user_id)
                quota = UserQuota(
                    user_id=user_id,
                    membership_type=user.membership,
                    total_quota=self._get_quota_limit(user.membership),
                    used_quota=1,
                    reset_at=self._get_next_reset_date(user.membership)
                )
                db.add(quota)

        except Exception as e:
            logger.error(f"Failed to update user quota: {e}")

    def _get_quota_limit(self, membership: MembershipType) -> int:
        """Get quota limit based on membership"""
        limits = {
            MembershipType.FREE: 20,
            MembershipType.BASIC: 200,
            MembershipType.PREMIUM: 500,
            MembershipType.SUPER: 1000
        }
        return limits.get(membership, 20)

    def _get_next_reset_date(self, membership: MembershipType) -> datetime:
        """Get next quota reset date"""
        now = datetime.utcnow()

        if membership == MembershipType.FREE:
            # Daily reset for free users
            return now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        else:
            # Monthly reset for paid users
            if now.month == 12:
                return now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                return now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    async def get_session_messages(
        self,
        db: AsyncSession,
        session_id: str,
        user_id: str,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get messages for a dialogue session"""
        try:
            # Verify session ownership
            session = await db.get(DialogueSession, session_id)
            if not session or session.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dialogue session not found"
                )

            # Get messages
            offset = (page - 1) * limit

            stmt = select(DialogueMessage).where(
                DialogueMessage.session_id == session_id
            ).order_by(desc(DialogueMessage.created_at)).offset(offset).limit(limit)

            result = await db.execute(stmt)
            messages = result.scalars().all()

            # Get total count
            count_stmt = select(func.count()).select_from(DialogueMessage).where(
                DialogueMessage.session_id == session_id
            )
            total = await db.scalar(count_stmt)

            # Convert to response format
            message_responses = []
            for msg in reversed(messages):  # Show in chronological order
                # Reconstruct references for response
                msg_references = msg.reference_metadata if msg.reference_metadata else []

                message_responses.append(DialogueMessageResponse(
                    id=str(msg.id),  # Convert UUID to string
                    session_id=str(msg.session_id),  # Convert UUID to string
                    role=msg.role,  # Already a string
                    content=msg.content,
                    references=msg_references,
                    timestamp=msg.created_at,
                    tokens_used=msg.tokens_used or 0,
                    model_used=msg.model_used
                ))

            return {
                "messages": message_responses,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": (total + limit - 1) // limit,
                    "has_next": page * limit < total,
                    "has_prev": page > 1
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get session messages: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get messages: {str(e)}"
            )


# Global instance
dialogue_service = DialogueService()