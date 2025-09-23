#!/usr/bin/env python3
"""Make user admin"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from datetime import datetime
import os
from dotenv import load_dotenv
import uuid

# Load environment
load_dotenv()

async def make_user_admin():
    """Make existing user an admin"""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/inknowing_v4")

    # Create engine
    engine = create_async_engine(database_url, echo=True)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # First, let's check the table structure
        result = await session.execute(
            text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'auth'
                AND table_name = 'users'
                ORDER BY ordinal_position
            """)
        )
        columns = result.fetchall()
        print("\nAvailable columns in auth.users:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

        # Check if the user exists and their current role
        result = await session.execute(
            text("""
                SELECT id, username, phone, membership
                FROM auth.users
                WHERE phone = :phone
            """),
            {"phone": "13800000001"}
        )

        user = result.fetchone()

        if user:
            print(f"\n✅ User found:")
            print(f"  ID: {user[0]}")
            print(f"  Username: {user[1]}")
            print(f"  Phone: {user[2]}")
            print(f"  Membership: {user[3]}")

            # Since we don't have is_admin column, admin access might be controlled by membership type
            # or by a separate admin table

            # Check if there's an admins table
            result = await session.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'auth'
                    AND table_name LIKE '%admin%'
                """)
            )
            admin_tables = result.fetchall()
            print("\nAdmin-related tables:")
            for table in admin_tables:
                print(f"  - {table[0]}")
        else:
            print("❌ User not found")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(make_user_admin())