#!/usr/bin/env python3
"""Create test admin user for testing"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Import models
from backend.models.user import User, UserStatus, MembershipType
from backend.core.security import get_password_hash

async def create_test_admin():
    """Create a test admin user"""

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/inknowing_v4")

    # Create engine
    engine = create_async_engine(database_url, echo=True)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.phone == "13800000001")
        )
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print(f"Admin already exists: {existing_admin.phone}")
            # Update password and status
            existing_admin.password_hash = get_password_hash("admin123456")
            existing_admin.status = UserStatus.ACTIVE
            existing_admin.phone_verified = True
            existing_admin.membership = MembershipType.PREMIUM
            await session.commit()
            print(f"Updated admin user: {existing_admin.phone}")
        else:
            # Create new admin user
            admin = User(
                username="admin",
                phone="13800000001",
                password_hash=get_password_hash("admin123456"),
                nickname="测试管理员",
                phone_verified=True,
                status=UserStatus.ACTIVE,
                membership=MembershipType.PREMIUM,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            session.add(admin)
            await session.commit()
            print(f"Created admin user: {admin.phone}")
            print("Password: admin123456")

    await engine.dispose()
    print("\n✅ Test admin user ready!")
    print("Phone: 13800000001")
    print("Password: admin123456")

if __name__ == "__main__":
    asyncio.run(create_test_admin())