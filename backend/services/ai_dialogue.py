"""
AI Dialogue Service for processing dialogue with LLM integration
"""
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime
import asyncio
import json
import os
from openai import AsyncOpenAI
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from models.dialogue import DialogueSession, DialogueMessage, DialogueType
from models.book import Book, BookCharacter, BookType
from config.settings import settings


class AIDialogueService:
    """Service for AI-powered dialogue processing"""

    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize AI clients
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if hasattr(settings, 'OPENAI_API_KEY') else None
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if hasattr(settings, 'ANTHROPIC_API_KEY') else None
        self.default_model = getattr(settings, 'DEFAULT_AI_MODEL', 'gpt-4')

    async def process_dialogue(
        self,
        session: DialogueSession,
        user_message: str,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Process a dialogue message with AI

        Returns:
            Dictionary containing AI response and metadata
        """
        # Build context from session
        context = await self._build_context(session)

        # Get system prompt
        system_prompt = await self._generate_system_prompt(session)

        # Get conversation history
        history = await self._get_conversation_history(session)

        # Process with AI
        if stream:
            return await self._process_streaming(
                system_prompt,
                history,
                user_message,
                context
            )
        else:
            return await self._process_non_streaming(
                system_prompt,
                history,
                user_message,
                context
            )

    async def stream_dialogue(
        self,
        session: DialogueSession,
        user_message: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream AI response for dialogue

        Yields chunks of response content and metadata
        """
        # Build context
        context = await self._build_context(session)
        system_prompt = await self._generate_system_prompt(session)
        history = await self._get_conversation_history(session)

        # Stream from AI
        async for chunk in self._stream_from_ai(
            system_prompt,
            history,
            user_message,
            context
        ):
            yield chunk

    async def generate_suggestions(
        self,
        session: DialogueSession,
        recent_messages: List[DialogueMessage],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate suggested questions based on conversation context
        """
        # Build context
        context = await self._build_context(session)

        # Create prompt for suggestions
        messages_text = self._format_messages_for_context(recent_messages[-10:])

        prompt = f"""Based on this dialogue about a book, suggest {limit} relevant follow-up questions.

Context:
{messages_text}

Book: {context.get('book_title', 'Unknown')}
Mode: {session.mode}

Generate {limit} thought-provoking questions that would deepen the discussion.
Return as JSON array with format: [{{"question": "...", "category": "...", "relevance_score": 0.0-1.0}}]"""

        # Get suggestions from AI
        response = await self._query_ai_for_json(prompt)

        try:
            suggestions = json.loads(response)
            return suggestions[:limit]
        except json.JSONDecodeError:
            # Fallback suggestions
            return self._get_fallback_suggestions(limit)

    async def _build_context(self, session: DialogueSession) -> Dict[str, Any]:
        """Build context information for the dialogue"""
        context = {
            "mode": session.mode,
            "session_id": session.id,
            "message_count": session.message_count
        }

        # Add book context
        if session.book_id:
            book = await self.db.get(Book, session.book_id)
            if book:
                context.update({
                    "book_id": book.id,
                    "book_title": book.title,
                    "book_author": book.author,
                    "book_description": book.description,
                    "book_type": book.type,
                    "book_category": book.category
                })

                # Add book content context if available
                if book.type == BookType.AI_KNOWN:
                    context["book_knowledge"] = "AI has general knowledge about this book"
                elif book.type == BookType.VECTORIZED:
                    context["book_knowledge"] = "AI has access to book content via vector database"
                    # TODO: Add vector search integration here

        # Add character context
        if session.character_id:
            character = await self.db.get(BookCharacter, session.character_id)
            if character:
                context.update({
                    "character_id": character.id,
                    "character_name": character.name,
                    "character_description": character.description,
                    "character_personality": character.personality
                })

        # Add initial question context
        if session.initial_question:
            context["initial_question"] = session.initial_question

        return context

    async def _generate_system_prompt(self, session: DialogueSession) -> str:
        """Generate system prompt based on session context"""
        # Use custom prompt if provided
        if session.system_prompt:
            return session.system_prompt

        context = await self._build_context(session)

        # Base prompt
        base_prompt = """You are an intelligent reading assistant helping users explore and understand books through dialogue."""

        # Mode-specific prompts
        if session.type == DialogueType.BOOK.value:
            prompt = f"""{base_prompt}
You are discussing the book "{context.get('book_title', 'a book')}" by {context.get('book_author', 'an author')}.

Book Description: {context.get('book_description', 'Not available')}
Category: {context.get('book_category', 'General')}

Help the user understand the book's themes, concepts, and ideas. Provide insightful analysis and encourage critical thinking.
When possible, reference specific parts of the book to support your responses."""

        elif session.type == DialogueType.CHARACTER.value:
            character_name = context.get('character_name', 'Character')
            prompt = f"""{base_prompt}
You are roleplaying as {character_name} from the book "{context.get('book_title', 'a book')}".

Character Description: {context.get('character_description', 'A character from the book')}
Personality: {context.get('character_personality', 'Engaging and knowledgeable')}

Respond in character, maintaining their personality and perspective. Draw from their experiences and knowledge within the book's narrative.
Help the user explore the story and themes through this character's eyes."""

        elif session.type == DialogueType.QUESTION.value:
            prompt = f"""{base_prompt}
You are helping the user explore a specific question about the book "{context.get('book_title', 'a book')}".

Initial Question: {context.get('initial_question', 'Not specified')}

Focus on thoroughly addressing this question and related topics. Provide comprehensive insights and encourage deeper exploration of the subject."""

        else:
            prompt = base_prompt

        # Add book type context
        if context.get('book_type') == BookType.VECTORIZED:
            prompt += "\n\nNote: You have access to the full text of this book through vector search. Cite specific passages when relevant."

        return prompt

    async def _get_conversation_history(
        self,
        session: DialogueSession,
        limit: int = 20
    ) -> List[Dict[str, str]]:
        """Get recent conversation history for context"""
        from sqlalchemy import select, desc

        # Query recent messages
        query = select(DialogueMessage).where(
            DialogueMessage.session_id == session.id
        ).order_by(desc(DialogueMessage.created_at)).limit(limit)

        result = await self.db.execute(query)
        messages = list(result.scalars().all())

        # Reverse to get chronological order
        messages.reverse()

        # Format for AI context
        history = []
        for msg in messages:
            history.append({
                "role": msg.role,
                "content": msg.content
            })

        return history

    async def _process_non_streaming(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process dialogue without streaming"""
        import time
        start_time = time.time()

        try:
            # Prepare messages for AI
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            messages.extend(history)
            messages.append({"role": "user", "content": user_message})

            # Query AI (using OpenAI as example)
            if self.openai_client:
                response = await self.openai_client.chat.completions.create(
                    model=self.default_model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000
                )

                content = response.choices[0].message.content
                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
                model_used = response.model

            else:
                # Fallback mock response
                content = f"I understand you're asking about: {user_message[:100]}... Let me help you explore this topic."
                input_tokens = len(user_message.split())
                output_tokens = len(content.split())
                model_used = "mock"

            # Extract book references if present
            references = await self._extract_references(content, context)

            processing_time = time.time() - start_time

            return {
                "content": content,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "references": references,
                "model": model_used,
                "processing_time": processing_time
            }

        except Exception as e:
            # Log error and return fallback
            print(f"AI processing error: {e}")
            return {
                "content": "I apologize, but I'm having trouble processing your request. Please try again.",
                "input_tokens": 0,
                "output_tokens": 0,
                "references": [],
                "model": "error",
                "processing_time": time.time() - start_time,
                "error": str(e)
            }

    async def _process_streaming(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process dialogue with streaming (returns metadata only)"""
        # For streaming, we just return metadata
        # Actual streaming happens in stream_dialogue method
        return {
            "streaming": True,
            "model": self.default_model,
            "context": context
        }

    async def _stream_from_ai(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
        context: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response from AI"""
        try:
            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            messages.extend(history)
            messages.append({"role": "user", "content": user_message})

            if self.openai_client:
                # Stream from OpenAI
                stream = await self.openai_client.chat.completions.create(
                    model=self.default_model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000,
                    stream=True
                )

                full_content = ""
                async for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_content += content
                        yield {
                            "type": "content",
                            "content": content
                        }

                # Extract references from full content
                references = await self._extract_references(full_content, context)
                for ref in references:
                    yield {
                        "type": "reference",
                        "reference": ref
                    }

                # Send metadata
                yield {
                    "type": "metadata",
                    "tokens": {
                        "input": len(" ".join([m["content"] for m in messages]).split()),
                        "output": len(full_content.split())
                    }
                }

            else:
                # Mock streaming
                mock_response = "This is a simulated streaming response. "
                words = mock_response.split()

                for word in words:
                    await asyncio.sleep(0.05)
                    yield {
                        "type": "content",
                        "content": word + " "
                    }

                yield {
                    "type": "metadata",
                    "tokens": {"input": 10, "output": len(words)}
                }

            # Send end signal
            yield {"type": "end"}

        except Exception as e:
            yield {
                "type": "error",
                "error": str(e)
            }
            yield {"type": "end"}

    async def _extract_references(
        self,
        content: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract book references from AI response"""
        references = []

        # Simple reference extraction (would be more sophisticated in production)
        # Look for patterns like "Chapter X", "Page Y", quotes, etc.
        import re

        # Find chapter references
        chapter_matches = re.findall(r'[Cc]hapter\s+(\d+)', content)
        for chapter in chapter_matches[:3]:  # Limit to 3 references
            references.append({
                "chapter": int(chapter),
                "quote": f"Reference to Chapter {chapter}",
                "relevance_score": 0.8
            })

        # Find quoted text (simplified)
        quote_matches = re.findall(r'"([^"]{20,200})"', content)
        for quote in quote_matches[:2]:
            references.append({
                "quote": quote,
                "relevance_score": 0.9
            })

        return references

    async def _query_ai_for_json(self, prompt: str) -> str:
        """Query AI for JSON response"""
        try:
            if self.openai_client:
                response = await self.openai_client.chat.completions.create(
                    model=self.default_model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that responds in valid JSON format."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                    max_tokens=500
                )
                return response.choices[0].message.content
            else:
                # Mock response
                return json.dumps(self._get_fallback_suggestions(5))

        except Exception as e:
            print(f"AI query error: {e}")
            return json.dumps(self._get_fallback_suggestions(5))

    def _format_messages_for_context(
        self,
        messages: List[DialogueMessage]
    ) -> str:
        """Format messages for AI context"""
        lines = []
        for msg in messages:
            role = "User" if msg.role == "user" else "Assistant"
            lines.append(f"{role}: {msg.content[:200]}...")
        return "\n".join(lines)

    def _get_fallback_suggestions(self, limit: int) -> List[Dict[str, Any]]:
        """Get fallback question suggestions"""
        suggestions = [
            {
                "question": "What are the main themes explored in this book?",
                "category": "themes",
                "relevance_score": 0.9
            },
            {
                "question": "How does this concept apply to real-world situations?",
                "category": "application",
                "relevance_score": 0.85
            },
            {
                "question": "Can you explain this idea in simpler terms?",
                "category": "clarification",
                "relevance_score": 0.8
            },
            {
                "question": "What are the author's main arguments?",
                "category": "analysis",
                "relevance_score": 0.75
            },
            {
                "question": "How does this relate to other books in this genre?",
                "category": "comparison",
                "relevance_score": 0.7
            }
        ]
        return suggestions[:limit]