"""
Check and create test user if needed
"""
import asyncio
from sqlalchemy import select
from config.database import get_db
from models.user import User
from core.security import get_password_hash
from datetime import datetime
import uuid


async def main():
    async for db in get_db():
        try:
            # Check if testuser exists
            stmt = select(User).where(User.username == "testuser")
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            if user:
                print(f"Test user already exists: {user.username} (ID: {user.id})")
            else:
                # Create test user
                user = User(
                    id=uuid.uuid4(),
                    username="testuser",
                    phone="13800138000",
                    phone_verified=True,
                    password_hash=get_password_hash("Test123456"),
                    nickname="Test User",
                    membership="free",
                    status="active",
                    created_at=datetime.utcnow()
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
                print(f"Test user created: {user.username} (ID: {user.id})")

            # List all users
            print("\nAll users in database:")
            all_users = await db.execute(select(User).limit(10))
            for u in all_users.scalars().all():
                print(f"  - {u.username} ({u.phone}) - {u.membership} - {u.status}")

        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()
        finally:
            await db.close()
            break


if __name__ == "__main__":
    asyncio.run(main())