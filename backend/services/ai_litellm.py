"""
Simplified AI Service using LiteLLM as the default provider
"""
import os
import time
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime
from backend.services.litellm_service import LiteLLMService
from backend.core.logger import logger


class SimplifiedAIService:
    """Simplified AI service using LiteLLM"""

    def __init__(self):
        """Initialize with LiteLLM service"""
        self.litellm = LiteLLMService()
        self.cost_per_1k_input = 0.001  # Default cost estimation
        self.cost_per_1k_output = 0.003  # Default cost estimation

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        user_id: str = None,
        session_id: str = None,
        feature: str = "dialogue",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create chat completion using LiteLLM

        Returns:
            Dict with content, model, usage info
        """
        try:
            start_time = time.time()

            if stream:
                # Return async generator for streaming
                return self._create_stream(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )

            # Non-streaming response
            response = await self.litellm.chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False,
                **kwargs
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # Extract usage information
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0

            return {
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                    "cost": self._calculate_cost(input_tokens, output_tokens)
                },
                "latency_ms": latency_ms,
                "provider": "litellm",
                "feature": feature
            }

        except Exception as e:
            logger.error(f"AI chat completion error: {e}")
            # Return a fallback response
            return {
                "content": "I apologize, but I'm having trouble generating a response right now. Please try again.",
                "model": "fallback",
                "usage": {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0,
                    "cost": 0
                },
                "error": str(e)
            }

    async def _create_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Create streaming response"""
        try:
            stream = await self.litellm.chat_completion(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **kwargs
            )

            async for chunk in stream:
                yield chunk

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def create_embedding(
        self,
        text: str,
        **kwargs
    ) -> List[float]:
        """Create text embedding using LiteLLM"""
        try:
            return await self.litellm.create_embedding(text, **kwargs)
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536  # Default dimension

    def _calculate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        provider: str = "litellm",
        model: str = None
    ) -> float:
        """Calculate cost based on token usage"""
        input_cost = (input_tokens / 1000) * self.cost_per_1k_input
        output_cost = (output_tokens / 1000) * self.cost_per_1k_output
        return round(input_cost + output_cost, 6)

    async def check_book_knowledge(
        self,
        title: str,
        author: str
    ) -> Dict[str, Any]:
        """Check if AI knows about a specific book"""
        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a book knowledge expert. Answer precisely and concisely."
                },
                {
                    "role": "user",
                    "content": f"Do you know the book '{title}' by {author}? If yes, briefly describe its main themes and confirm you can discuss it. If no, just say 'I don't know this book.'"
                }
            ]

            response = await self.chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=200
            )

            content = response["content"].lower()
            ai_knows = "don't know" not in content and "do not know" not in content

            return {
                "ai_knows_book": ai_knows,
                "confidence": 0.8 if ai_knows else 0.2,
                "response": response["content"]
            }

        except Exception as e:
            logger.error(f"Book knowledge check error: {e}")
            return {
                "ai_knows_book": False,
                "confidence": 0,
                "error": str(e)
            }

    async def test_connection(self) -> Dict[str, Any]:
        """Test AI service connection"""
        try:
            result = await self.litellm.test_connection()
            return {
                "status": "connected",
                "provider": "litellm",
                "details": result
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }


# Global instance - use the simplified service
ai_service = SimplifiedAIService()