#!/usr/bin/env python3
"""Create admin user for the system"""
import asyncio
import sys
import os
from datetime import datetime
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from backend.config.settings import settings
from backend.models.user import User, MembershipType, UserStatus
from backend.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_admin_user():
    """Create or update admin user"""
    try:
        # Create database connection
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with AsyncSessionLocal() as db:
            # Check if admin user exists
            admin_username = "admin"
            admin_email = "admin@inknowing.com"
            admin_password = "Admin@123456"  # Default admin password

            # Check existing admin
            stmt = select(User).where(User.username == admin_username)
            result = await db.execute(stmt)
            existing_admin = result.scalar_one_or_none()

            if existing_admin:
                logger.info(f"Admin user already exists: {admin_username}")
                # Update to ensure super membership
                existing_admin.membership = MembershipType.SUPER
                existing_admin.status = UserStatus.ACTIVE
                existing_admin.updated_at = datetime.utcnow()
                # Update password
                existing_admin.password_hash = get_password_hash(admin_password)
                await db.commit()
                logger.info("Admin user updated successfully")
            else:
                # Create new admin user
                admin_user = User(
                    id=uuid.uuid4(),
                    username=admin_username,
                    email=admin_email,
                    phone="13900000001",  # Admin phone
                    nickname="Administrator",
                    password_hash=get_password_hash(admin_password),
                    membership=MembershipType.SUPER,
                    status=UserStatus.ACTIVE,
                    avatar="/images/avatars/admin.png"
                )
                db.add(admin_user)
                await db.commit()
                logger.info(f"Admin user created successfully: {admin_username}")

            print("\n" + "="*50)
            print("Admin User Credentials:")
            print("="*50)
            print(f"Username: {admin_username}")
            print(f"Password: {admin_password}")
            print(f"Email: {admin_email}")
            print("="*50)

            # Also create/update a test regular user for comparison
            test_username = "testuser"
            test_email = "test@inknowing.com"
            test_password = "Test@123456"

            stmt = select(User).where(User.username == test_username)
            result = await db.execute(stmt)
            test_user = result.scalar_one_or_none()

            if not test_user:
                test_user = User(
                    id=uuid.uuid4(),
                    username=test_username,
                    email=test_email,
                    phone="13900000003",
                    nickname="Test User",
                    password_hash=get_password_hash(test_password),
                    membership=MembershipType.FREE,
                    status=UserStatus.ACTIVE,
                    avatar="/images/avatars/default.png"
                )
                db.add(test_user)
                await db.commit()
                logger.info(f"Test user created: {test_username}")

                print("\nTest User Credentials:")
                print("="*50)
                print(f"Username: {test_username}")
                print(f"Password: {test_password}")
                print(f"Email: {test_email}")
                print("="*50)

            return True

    except Exception as e:
        logger.error(f"Failed to create admin user: {e}", exc_info=True)
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(create_admin_user())
    sys.exit(0 if success else 1)