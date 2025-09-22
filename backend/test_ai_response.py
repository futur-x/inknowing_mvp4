#!/usr/bin/env python3
"""Test AI response functionality directly"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config.database import DATABASE_URL
from services.ai import AIService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_ai_response():
    """Test AI service directly"""
    try:
        # Create database connection
        engine = create_async_engine(DATABASE_URL, echo=False)
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with AsyncSessionLocal() as db:
            # Initialize AI service
            logger.info("Initializing AI service...")
            ai_service = AIService()
            await ai_service.initialize(db)
            logger.info(f"AI service initialized with {len(ai_service.providers)} providers")

            # Test simple chat completion
            logger.info("Testing chat completion...")
            messages = [
                {"role": "system", "content": "You are a helpful assistant discussing books."},
                {"role": "user", "content": "Hello, can you respond to this test message?"}
            ]

            response = await ai_service.chat_completion(
                messages=messages,
                user_id="test_user",
                session_id="test_session",
                feature="dialogue",
                temperature=0.7
            )

            logger.info(f"Response received: {response}")

            if response and "content" in response:
                logger.info(f"AI Response content: {response['content'][:200]}...")
                logger.info(f"Model used: {response.get('model')}")
                logger.info(f"Tokens: {response.get('usage')}")
                return True
            else:
                logger.error("No valid response received")
                return False

    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(test_ai_response())
    sys.exit(0 if success else 1)