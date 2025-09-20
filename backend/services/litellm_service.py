"""
LiteLLM Service Integration for AI Dialogue
Supports both chat and embedding models through LiteLLM proxy
"""
from typing import Optional, List, Dict, Any, AsyncGenerator
import os
import asyncio
from openai import AsyncOpenAI
import httpx
from datetime import datetime


class LiteLLMService:
    """Service for interacting with LiteLLM API"""

    def __init__(self):
        """Initialize LiteLLM service with configuration from environment"""
        # Get configuration from environment or use defaults
        self.base_url = os.getenv("AI_BASE_URL", "https://litellm.futurx.cc")
        self.api_key = os.getenv("AI_API_KEY", "sk-tptTrlFHR14EDpg")
        self.chat_model = os.getenv("AI_CHAT_MODEL", "anthropic/claude-3-5-haiku-20241022")
        self.embedding_model = os.getenv("AI_EMBEDDING_MODEL", "azure/text-embedding-3-large")
        self.temperature = float(os.getenv("AI_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", "4096"))

        # Initialize OpenAI-compatible client for LiteLLM
        self.client = AsyncOpenAI(
            base_url=f"{self.base_url}/v1",
            api_key=self.api_key,
            http_client=httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_connections=100)
            )
        )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Any:
        """
        Create a chat completion using LiteLLM

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            stream: Whether to stream the response
            temperature: Override default temperature
            max_tokens: Override default max tokens
            **kwargs: Additional parameters for the API

        Returns:
            Chat completion response or async generator for streaming
        """
        try:
            params = {
                "model": self.chat_model,
                "messages": messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
                "stream": stream,
                **kwargs
            }

            if stream:
                return self._create_chat_stream(params)
            else:
                return await self.client.chat.completions.create(**params)

        except Exception as e:
            print(f"LiteLLM chat error: {e}")
            raise

    async def _create_chat_stream(self, params: dict) -> AsyncGenerator[Dict[str, Any], None]:
        """Create streaming chat completion"""
        try:
            stream = await self.client.chat.completions.create(**params)
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield {
                        "type": "content",
                        "content": chunk.choices[0].delta.content,
                        "timestamp": datetime.utcnow().isoformat()
                    }

        except Exception as e:
            print(f"LiteLLM streaming error: {e}")
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
        """
        Create text embedding using LiteLLM

        Args:
            text: Text to embed
            **kwargs: Additional parameters

        Returns:
            Embedding vector
        """
        try:
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=text,
                **kwargs
            )
            return response.data[0].embedding

        except Exception as e:
            print(f"LiteLLM embedding error: {e}")
            raise

    async def test_connection(self) -> Dict[str, Any]:
        """Test the LiteLLM connection and configuration"""
        try:
            # Test chat completion
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'Hello, LiteLLM is working!' in exactly those words."}
            ]

            response = await self.chat_completion(
                messages=messages,
                max_tokens=20,
                temperature=0
            )

            chat_response = response.choices[0].message.content

            # Test embedding (optional, might fail if not configured)
            embedding_status = "not tested"
            try:
                embedding = await self.create_embedding("test")
                if embedding and len(embedding) > 0:
                    embedding_status = f"working (dimension: {len(embedding)})"
            except:
                embedding_status = "failed or not configured"

            return {
                "status": "connected",
                "base_url": self.base_url,
                "chat_model": self.chat_model,
                "chat_response": chat_response,
                "embedding_model": self.embedding_model,
                "embedding_status": embedding_status,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {
                "status": "error",
                "base_url": self.base_url,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    async def health_check(self) -> bool:
        """Simple health check for the service"""
        try:
            result = await self.test_connection()
            return result.get("status") == "connected"
        except:
            return False


# Singleton instance
_litellm_service: Optional[LiteLLMService] = None


def get_litellm_service() -> LiteLLMService:
    """Get or create the LiteLLM service singleton"""
    global _litellm_service
    if _litellm_service is None:
        _litellm_service = LiteLLMService()
    return _litellm_service