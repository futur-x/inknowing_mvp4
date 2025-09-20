#!/usr/bin/env python3
"""
Debug script for dialogue creation issues
"""
import asyncio
import json
from sqlalchemy import text
from config.database import engine, get_db
from models.dialogue import DialogueSession, DialogueMessage
from sqlalchemy.ext.asyncio import AsyncSession
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_direct_db():
    """Test direct database operations"""
    async with engine.begin() as conn:
        # Get an existing user ID
        result = await conn.execute(text("SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1"))
        user = await result.fetchone()
        if not user:
            logger.error("No test user found! Please create a test user first.")
            return
        user_id = user[0]
        logger.info(f"Using user ID: {user_id}")

        # Get an existing book ID
        result = await conn.execute(text("SELECT id FROM content.books WHERE book_id = 'test-leadership-101' LIMIT 1"))
        book = await result.fetchone()
        if not book:
            logger.error("No test book found! Please create test book first.")
            return
        book_id = book[0]
        logger.info(f"Using book ID: {book_id}")

        # First, clean up any existing test data
        await conn.execute(text("DELETE FROM dialogue_messages WHERE session_id IN (SELECT id FROM dialogue_sessions WHERE user_id = :user_id)"), {"user_id": user_id})
        await conn.execute(text("DELETE FROM dialogue_sessions WHERE user_id = :user_id"), {"user_id": user_id})

        # Create a test session
        result = await conn.execute(text("""
            INSERT INTO dialogue_sessions (id, user_id, book_id, type, status, initial_question, message_count, created_at)
            VALUES (
                gen_random_uuid(),
                :user_id,
                :book_id,
                'book',
                'active',
                'Test question',
                0,
                CURRENT_TIMESTAMP
            )
            RETURNING id
        """), {"user_id": user_id, "book_id": book_id})
        session_id = (await result.fetchone())[0]
        logger.info(f"Created session: {session_id}")

        # Try to insert a message
        try:
            await conn.execute(text("""
                INSERT INTO dialogue_messages (
                    id,
                    session_id,
                    message_id,
                    role,
                    content,
                    content_type,
                    model_used,
                    tokens_used,
                    created_at
                )
                VALUES (
                    gen_random_uuid(),
                    :session_id,
                    :message_id,
                    'user',
                    :content,
                    'text',
                    'user',
                    0,
                    CURRENT_TIMESTAMP
                )
            """), {
                "session_id": session_id,
                "message_id": "test-msg-001",
                "content": "Test message content"
            })
            logger.info("✓ Direct message insert successful")

            # Count messages
            result = await conn.execute(text("""
                SELECT COUNT(*) FROM dialogue_messages WHERE session_id = :session_id
            """), {"session_id": session_id})
            count = (await result.fetchone())[0]
            logger.info(f"✓ Message count: {count}")

        except Exception as e:
            logger.error(f"✗ Direct message insert failed: {e}")
            raise

async def test_sqlalchemy_model():
    """Test SQLAlchemy model operations"""
    from uuid import uuid4

    async for db in get_db():
        try:
            # Get existing user and book IDs
            result = await db.execute(text("SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1"))
            user = result.fetchone()
            if not user:
                logger.error("No test user found!")
                return
            user_id = user[0]

            result = await db.execute(text("SELECT id FROM content.books WHERE book_id = 'test-leadership-101' LIMIT 1"))
            book = result.fetchone()
            if not book:
                logger.error("No test book found!")
                return
            book_id = book[0]

            # Clean up first
            await db.execute(text("DELETE FROM dialogue_messages WHERE session_id IN (SELECT id FROM dialogue_sessions WHERE user_id = :user_id)"), {"user_id": user_id})
            await db.execute(text("DELETE FROM dialogue_sessions WHERE user_id = :user_id"), {"user_id": user_id})
            await db.commit()

            # Create session using model
            session = DialogueSession(
                user_id=user_id,
                book_id=book_id,
                type="book",
                status="active",
                initial_question="Test question",
                message_count=0
            )
            db.add(session)
            await db.flush()
            logger.info(f"✓ Created session via model: {session.id}")

            # Create message using model
            message = DialogueMessage(
                session_id=session.id,
                message_id=str(uuid4()),
                role="user",
                content="Test message via model",
                content_type="text",
                model_used="user",
                tokens_used=0
            )
            db.add(message)
            await db.flush()
            logger.info(f"✓ Created message via model: {message.id}")

            await db.commit()
            logger.info("✓ Transaction committed successfully")

        except Exception as e:
            await db.rollback()
            logger.error(f"✗ SQLAlchemy model test failed: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await db.close()
            break

async def main():
    logger.info("=" * 60)
    logger.info("DIALOGUE DATABASE DEBUG")
    logger.info("=" * 60)

    logger.info("\n1. Testing direct database operations...")
    try:
        await test_direct_db()
    except Exception as e:
        logger.error(f"Direct DB test failed: {e}")

    logger.info("\n2. Testing SQLAlchemy model operations...")
    try:
        await test_sqlalchemy_model()
    except Exception as e:
        logger.error(f"SQLAlchemy test failed: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("DEBUG COMPLETE")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())