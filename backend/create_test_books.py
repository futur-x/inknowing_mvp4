#!/usr/bin/env python3
"""
Create test books in database for dialogue testing
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.config.database import engine, init_db


async def create_test_books():
    """Create test books in database"""

    await init_db()

    async with engine.begin() as conn:
        # Clean existing test data
        await conn.execute(text("DELETE FROM content.books WHERE book_id LIKE 'test-%'"))

        # Insert test books
        test_books = [
            {
                "id": str(uuid.uuid4()),
                "book_id": "test-leadership-101",
                "title": "Leadership Excellence",
                "author": "John Maxwell",
                "description": "A comprehensive guide to becoming an effective leader",
                "category": "business",
                "type": "ai_known",
                "status": "published",
                "ai_known": True
            },
            {
                "id": str(uuid.uuid4()),
                "book_id": "test-mindset-growth",
                "title": "Growth Mindset",
                "author": "Carol Dweck",
                "description": "How to develop a growth mindset for success",
                "category": "psychology",
                "type": "ai_known",
                "status": "published",
                "ai_known": True
            },
            {
                "id": str(uuid.uuid4()),
                "book_id": "test-habits-atomic",
                "title": "Atomic Habits",
                "author": "James Clear",
                "description": "An easy and proven way to build good habits and break bad ones",
                "category": "self-help",
                "type": "ai_known",
                "status": "published",
                "ai_known": True
            }
        ]

        for book in test_books:
            query = text(f"""
                INSERT INTO content.books
                (id, book_id, title, author, description, category, type, status, ai_known, created_at)
                VALUES (:id, :book_id, :title, :author, :description, :category, '{book["type"]}'::book_type, '{book["status"]}'::book_status, :ai_known, :created_at)
            """)

            await conn.execute(query, {
                "id": book["id"],
                "book_id": book["book_id"],
                "title": book["title"],
                "author": book["author"],
                "description": book["description"],
                "category": book["category"],
                "ai_known": book["ai_known"],
                "created_at": datetime.utcnow()
            })

        print(f"✓ Created {len(test_books)} test books")

        # Verify books were created
        result = await conn.execute(text("SELECT book_id, title FROM content.books WHERE book_id LIKE 'test-%'"))
        books = result.fetchall()

        print("\nCreated books:")
        for book in books:
            print(f"  - {book[0]}: {book[1]}")


if __name__ == "__main__":
    asyncio.run(create_test_books())