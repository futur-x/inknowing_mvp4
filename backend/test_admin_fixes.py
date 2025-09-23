#!/usr/bin/env python
"""
Test script to verify admin service field fixes
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from backend.config.database import get_settings
from backend.services.admin import AdminService
from backend.core.logger import logger

async def test_admin_service():
    """Test the admin service methods"""
    # Get database settings
    settings = get_settings()

    # Create async engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=0
    )

    # Create async session
    AsyncSessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with AsyncSessionLocal() as db:
        service = AdminService(db)

        print("Testing admin service methods...")
        print("-" * 50)

        # Test 1: get_user_stats
        try:
            print("1. Testing get_user_stats...")
            user_stats = await service.get_user_stats()
            print(f"   ✓ User stats retrieved: {user_stats}")
        except Exception as e:
            print(f"   ✗ Error in get_user_stats: {e}")

        # Test 2: get_book_stats
        try:
            print("\n2. Testing get_book_stats...")
            book_stats = await service.get_book_stats()
            print(f"   ✓ Book stats retrieved: {book_stats}")
        except Exception as e:
            print(f"   ✗ Error in get_book_stats: {e}")

        # Test 3: get_dialogue_stats_summary
        try:
            print("\n3. Testing get_dialogue_stats_summary...")
            dialogue_stats = await service.get_dialogue_stats_summary()
            print(f"   ✓ Dialogue stats retrieved: {dialogue_stats}")
        except Exception as e:
            print(f"   ✗ Error in get_dialogue_stats_summary: {e}")

        # Test 4: list_users with sorting
        try:
            print("\n4. Testing list_users with last_active sorting...")
            users = await service.list_users(
                sort_by="last_active",
                page=1,
                limit=5
            )
            print(f"   ✓ Users listed: {len(users['users'])} users found")
        except Exception as e:
            print(f"   ✗ Error in list_users: {e}")

        print("\n" + "=" * 50)
        print("Testing complete!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_admin_service())