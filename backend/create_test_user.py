import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from config.database import AsyncSessionLocal
from models.user import User
from core.security import get_password_hash

async def create_test_user():
    async with AsyncSessionLocal() as db:
        # Check if user exists
        stmt = select(User).where(User.phone == "13812345678")
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"User already exists: {existing_user.phone}")
            print(f"  ID: {existing_user.id}")
            print(f"  Username: {existing_user.username}")
        else:
            # Create test user
            user = User(
                phone="13812345678",
                username="user_13812345678",
                password_hash=get_password_hash("Test123!@#"),
                nickname="Test User",
                membership="free",
                points=100,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"Created user: {user.phone} with password: Test123!@#")
            print(f"  ID: {user.id}")
            print(f"  Username: {user.username}")

if __name__ == "__main__":
    asyncio.run(create_test_user())