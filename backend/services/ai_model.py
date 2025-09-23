"""
AI Model Service - Manages multiple AI providers and model routing
"""
import os
import time
import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
from abc import ABC, abstractmethod

import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from backend.models.admin import AIModelConfig
from backend.models.dialogue import (
    DialogueSession,
    DialogueMessage,
    AIUsageTracking,
    PromptTemplate,
    MessageRole,
)
from backend.schemas.ai_model import (
    AIProvider,
    ModelStatus,
    TokenUsage,
    ModelTestResult,
    AICheckResult,
)
from backend.config.database import get_db
from backend.core.logger import logger
from backend.core.security import decrypt_data


class AIProviderBase(ABC):
    """Base class for AI providers"""

    def __init__(self, api_key: str, api_endpoint: Optional[str] = None):
        self.api_key = api_key
        self.api_endpoint = api_endpoint

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat completion"""
        pass

    @abstractmethod
    async def embedding(
        self,
        text: str,
        model: str,
        **kwargs
    ) -> List[float]:
        """Generate text embedding"""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """Test API connection"""
        pass


class OpenAIProvider(AIProviderBase):
    """OpenAI provider implementation"""

    def __init__(self, api_key: str, api_endpoint: Optional[str] = None):
        super().__init__(api_key, api_endpoint)
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=api_endpoint if api_endpoint else None
        )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat completion using OpenAI"""
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream,
                **kwargs
            )

            if stream:
                return {"stream": response}

            return {
                "content": response.choices[0].message.content,
                "usage": {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "model": model
            }
        except Exception as e:
            logger.error(f"OpenAI chat completion error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI API error: {str(e)}"
            )

    async def embedding(
        self,
        text: str,
        model: str = "text-embedding-3-small",
        **kwargs
    ) -> List[float]:
        """Generate text embedding using OpenAI"""
        try:
            response = await self.client.embeddings.create(
                model=model,
                input=text,
                **kwargs
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI embedding error: {str(e)}"
            )

    async def test_connection(self) -> bool:
        """Test OpenAI API connection"""
        try:
            await self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"OpenAI connection test failed: {e}")
            return False


class AnthropicProvider(AIProviderBase):
    """Anthropic (Claude) provider implementation"""

    def __init__(self, api_key: str, api_endpoint: Optional[str] = None):
        super().__init__(api_key, api_endpoint)
        self.client = AsyncAnthropic(
            api_key=api_key,
            base_url=api_endpoint if api_endpoint else None
        )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat completion using Anthropic"""
        try:
            # Convert messages format for Anthropic
            system_message = None
            user_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    user_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            response = await self.client.messages.create(
                model=model,
                messages=user_messages,
                system=system_message,
                temperature=temperature,
                max_tokens=max_tokens or 4096,
                stream=stream,
                **kwargs
            )

            if stream:
                return {"stream": response}

            return {
                "content": response.content[0].text,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                },
                "model": model
            }
        except Exception as e:
            logger.error(f"Anthropic chat completion error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Anthropic API error: {str(e)}"
            )

    async def embedding(
        self,
        text: str,
        model: str,
        **kwargs
    ) -> List[float]:
        """Anthropic doesn't provide embeddings, use fallback"""
        raise NotImplementedError("Anthropic doesn't support embeddings")

    async def test_connection(self) -> bool:
        """Test Anthropic API connection"""
        try:
            await self.client.messages.create(
                model="claude-3-sonnet-20240229",
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=10
            )
            return True
        except Exception as e:
            logger.error(f"Anthropic connection test failed: {e}")
            return False


class OllamaProvider(AIProviderBase):
    """Ollama (local) provider implementation"""

    def __init__(self, api_key: str = "", api_endpoint: str = "http://localhost:11434"):
        super().__init__(api_key, api_endpoint)
        self.client = httpx.AsyncClient(base_url=api_endpoint, timeout=60.0)

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat completion using Ollama"""
        try:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "stream": stream,
                **kwargs
            }

            if max_tokens:
                payload["options"] = {"num_predict": max_tokens}

            response = await self.client.post("/api/chat", json=payload)
            response.raise_for_status()

            if stream:
                return {"stream": response.iter_lines()}

            result = response.json()

            # Estimate tokens (Ollama doesn't provide exact counts)
            input_tokens = sum(len(msg["content"].split()) * 1.3 for msg in messages)
            output_tokens = len(result["message"]["content"].split()) * 1.3

            return {
                "content": result["message"]["content"],
                "usage": {
                    "input_tokens": int(input_tokens),
                    "output_tokens": int(output_tokens),
                    "total_tokens": int(input_tokens + output_tokens)
                },
                "model": model
            }
        except Exception as e:
            logger.error(f"Ollama chat completion error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama API error: {str(e)}"
            )

    async def embedding(
        self,
        text: str,
        model: str = "nomic-embed-text",
        **kwargs
    ) -> List[float]:
        """Generate text embedding using Ollama"""
        try:
            response = await self.client.post(
                "/api/embeddings",
                json={"model": model, "prompt": text}
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            logger.error(f"Ollama embedding error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ollama embedding error: {str(e)}"
            )

    async def test_connection(self) -> bool:
        """Test Ollama API connection"""
        try:
            response = await self.client.get("/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection test failed: {e}")
            return False

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()


class AIModelService:
    """Main AI model service for managing multiple providers"""

    def __init__(self):
        self.providers: Dict[str, AIProviderBase] = {}
        self.model_configs: Dict[str, AIModelConfig] = {}
        self.primary_model: Optional[str] = None
        self.backup_models: List[str] = []

    async def initialize(self, db: AsyncSession):
        """Initialize AI model service with configurations from database"""
        try:
            # Load all active model configurations
            stmt = select(AIModelConfig).where(AIModelConfig.status == "active")
            result = await db.execute(stmt)
            configs = result.scalars().all()

            for config in configs:
                # Decrypt API key
                api_key = decrypt_data(config.api_key_encrypted)

                # Create provider instance
                provider = self._create_provider(
                    config.provider,
                    api_key,
                    config.api_endpoint
                )

                self.providers[config.id] = provider
                self.model_configs[config.id] = config

                if config.is_primary:
                    self.primary_model = config.id
                elif config.is_backup:
                    self.backup_models.append(config.id)

            logger.info(f"Initialized {len(self.providers)} AI providers")

        except Exception as e:
            logger.error(f"Failed to initialize AI model service: {e}")
            raise

    def _create_provider(
        self,
        provider_type: str,
        api_key: str,
        api_endpoint: Optional[str] = None
    ) -> AIProviderBase:
        """Create provider instance based on type"""
        if provider_type == AIProvider.OPENAI:
            return OpenAIProvider(api_key, api_endpoint)
        elif provider_type == AIProvider.ANTHROPIC:
            return AnthropicProvider(api_key, api_endpoint)
        elif provider_type == AIProvider.OLLAMA:
            return OllamaProvider(api_key, api_endpoint)
        else:
            raise ValueError(f"Unsupported provider type: {provider_type}")

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model_id: Optional[str] = None,
        user_id: str = None,
        session_id: str = None,
        feature: str = "dialogue",
        stream: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate chat completion with automatic fallback"""
        start_time = time.time()

        # Select model
        if not model_id:
            model_id = self.primary_model
            if not model_id and self.backup_models:
                model_id = self.backup_models[0]

        if not model_id or model_id not in self.providers:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No AI model available"
            )

        provider = self.providers[model_id]
        config = self.model_configs[model_id]

        try:
            # Generate completion
            result = await provider.chat_completion(
                messages=messages,
                model=config.model,
                temperature=config.parameters.get("temperature", 0.7),
                max_tokens=config.parameters.get("max_tokens"),
                stream=stream,
                **kwargs
            )

            # Track usage if not streaming
            if not stream and user_id:
                latency_ms = int((time.time() - start_time) * 1000)
                await self._track_usage(
                    user_id=user_id,
                    session_id=session_id,
                    provider=config.provider,
                    model=config.model,
                    feature=feature,
                    usage=result.get("usage", {}),
                    latency_ms=latency_ms,
                    success=True
                )

            return result

        except Exception as e:
            # Try backup models
            if self.backup_models:
                for backup_id in self.backup_models:
                    if backup_id != model_id:
                        try:
                            provider = self.providers[backup_id]
                            config = self.model_configs[backup_id]

                            result = await provider.chat_completion(
                                messages=messages,
                                model=config.model,
                                temperature=config.parameters.get("temperature", 0.7),
                                max_tokens=config.parameters.get("max_tokens"),
                                stream=stream,
                                **kwargs
                            )

                            logger.info(f"Fallback to backup model {backup_id} succeeded")

                            if not stream and user_id:
                                latency_ms = int((time.time() - start_time) * 1000)
                                await self._track_usage(
                                    user_id=user_id,
                                    session_id=session_id,
                                    provider=config.provider,
                                    model=config.model,
                                    feature=feature,
                                    usage=result.get("usage", {}),
                                    latency_ms=latency_ms,
                                    success=True
                                )

                            return result
                        except:
                            continue

            # Track failed attempt
            if user_id:
                await self._track_usage(
                    user_id=user_id,
                    session_id=session_id,
                    provider=config.provider,
                    model=config.model,
                    feature=feature,
                    usage={},
                    latency_ms=int((time.time() - start_time) * 1000),
                    success=False,
                    error_message=str(e)
                )

            raise

    async def embedding(
        self,
        text: str,
        model_id: Optional[str] = None,
        **kwargs
    ) -> List[float]:
        """Generate text embedding"""
        # Find a provider that supports embeddings
        if not model_id:
            for mid, provider in self.providers.items():
                if isinstance(provider, (OpenAIProvider, OllamaProvider)):
                    model_id = mid
                    break

        if not model_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No embedding model available"
            )

        provider = self.providers[model_id]
        config = self.model_configs[model_id]

        # Use embedding model from config or default
        embedding_model = config.parameters.get(
            "embedding_model",
            "text-embedding-3-small" if isinstance(provider, OpenAIProvider) else "nomic-embed-text"
        )

        return await provider.embedding(text, embedding_model, **kwargs)

    async def test_model(
        self,
        provider_type: str,
        model: str,
        api_endpoint: str,
        api_key: str,
        test_prompt: str = "Hello, can you introduce yourself?"
    ) -> ModelTestResult:
        """Test AI model connection and response"""
        start_time = time.time()

        try:
            # Create temporary provider
            provider = self._create_provider(provider_type, api_key, api_endpoint)

            # Test connection
            connected = await provider.test_connection()
            if not connected:
                return ModelTestResult(
                    success=False,
                    latency=0,
                    error="Failed to connect to API"
                )

            # Test chat completion
            result = await provider.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": test_prompt}
                ],
                model=model,
                temperature=0.7,
                max_tokens=100
            )

            latency = (time.time() - start_time) * 1000

            # Calculate estimated cost
            usage = result.get("usage", {})
            cost = self._calculate_cost(
                usage.get("input_tokens", 0),
                usage.get("output_tokens", 0),
                provider_type,
                model
            )

            return ModelTestResult(
                success=True,
                latency=latency,
                response=result.get("content", ""),
                estimated_cost=cost
            )

        except Exception as e:
            return ModelTestResult(
                success=False,
                latency=(time.time() - start_time) * 1000,
                error=str(e)
            )

    async def check_ai_knowledge(
        self,
        title: str,
        author: str,
        model_id: Optional[str] = None
    ) -> AICheckResult:
        """Check if AI model has knowledge of a book"""
        prompt = f"""
        Do you have knowledge about the book "{title}" by {author}?
        If yes, please provide:
        1. Main chapters or sections (list up to 5)
        2. Main themes (list 3-5)
        3. Main characters (if fiction, list up to 5)

        Format your response as JSON:
        {{
            "knows_book": true/false,
            "confidence": 0-100,
            "chapters": ["chapter1", "chapter2", ...],
            "themes": ["theme1", "theme2", ...],
            "characters": ["character1", "character2", ...]
        }}
        """

        try:
            result = await self.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a book knowledge expert. Respond only with JSON."},
                    {"role": "user", "content": prompt}
                ],
                model_id=model_id,
                temperature=0.1,
                max_tokens=500
            )

            # Parse response
            content = result.get("content", "{}")
            try:
                data = json.loads(content)
            except:
                # Fallback parsing
                data = {
                    "knows_book": "yes" in content.lower() or "know" in content.lower(),
                    "confidence": 50,
                    "chapters": [],
                    "themes": [],
                    "characters": []
                }

            # Determine recommendation
            if data.get("knows_book") and data.get("confidence", 0) > 70:
                recommendation = "use_ai_directly"
            elif data.get("knows_book") and data.get("confidence", 0) > 30:
                recommendation = "manual_review_needed"
            else:
                recommendation = "needs_vectorization"

            return AICheckResult(
                ai_knows_book=data.get("knows_book", False),
                confidence=data.get("confidence", 0),
                detected_content={
                    "chapters": data.get("chapters", []),
                    "main_themes": data.get("themes", []),
                    "characters": data.get("characters", [])
                },
                recommendation=recommendation
            )

        except Exception as e:
            logger.error(f"AI knowledge check failed: {e}")
            return AICheckResult(
                ai_knows_book=False,
                confidence=0,
                detected_content={
                    "chapters": [],
                    "main_themes": [],
                    "characters": []
                },
                recommendation="needs_vectorization"
            )

    def _calculate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        provider: str,
        model: str
    ) -> float:
        """Calculate cost based on token usage"""
        # Default pricing (should be loaded from config)
        pricing = {
            "openai": {
                "gpt-4": {"input": 0.03, "output": 0.06},
                "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015}
            },
            "anthropic": {
                "claude-3-opus": {"input": 0.015, "output": 0.075},
                "claude-3-sonnet": {"input": 0.003, "output": 0.015}
            },
            "ollama": {
                "default": {"input": 0, "output": 0}
            }
        }

        provider_pricing = pricing.get(provider, pricing["ollama"])
        model_pricing = provider_pricing.get(model, provider_pricing.get("default", {"input": 0, "output": 0}))

        input_cost = (input_tokens / 1000) * model_pricing["input"]
        output_cost = (output_tokens / 1000) * model_pricing["output"]

        return input_cost + output_cost

    async def _track_usage(
        self,
        user_id: str,
        provider: str,
        model: str,
        feature: str,
        usage: Dict[str, int],
        latency_ms: int,
        success: bool,
        session_id: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Track AI usage for analytics and billing"""
        try:
            async for db in get_db():
                tracking = AIUsageTracking(
                    user_id=user_id,
                    session_id=session_id,
                    provider=provider,
                    model=model,
                    feature=feature,
                    input_tokens=usage.get("input_tokens", 0),
                    output_tokens=usage.get("output_tokens", 0),
                    total_tokens=usage.get("total_tokens", 0),
                    cost=self._calculate_cost(
                        usage.get("input_tokens", 0),
                        usage.get("output_tokens", 0),
                        provider,
                        model
                    ),
                    latency_ms=latency_ms,
                    success=success,
                    error_message=error_message
                )

                db.add(tracking)
                await db.commit()

        except Exception as e:
            logger.error(f"Failed to track AI usage: {e}")


# Global instance
ai_service = AIModelService()