#!/usr/bin/env python3
"""
Create test user directly in database
"""
import asyncio
import uuid
from datetime import datetime
import asyncpg
from backend.core.security import get_password_hash

async def create_test_user():
    """Create a test user directly in the database"""
    conn = await asyncpg.connect('postgresql://postgres@localhost:5432/inknowing_db')

    try:
        # Generate test user details
        user_id = uuid.uuid4()
        phone = "13800138000"
        username = f"testuser_{phone[-4:]}"
        password = "Test123!@#"
        password_hash = get_password_hash(password)

        # Check if user already exists
        existing = await conn.fetchval(
            "SELECT id FROM auth.users WHERE phone = $1 OR username = $2",
            phone, username
        )

        if existing:
            print(f"User already exists with ID: {existing}")
            # Update password
            await conn.execute(
                """
                UPDATE auth.users
                SET password_hash = $1, updated_at = $2
                WHERE phone = $3 OR username = $4
                """,
                password_hash, datetime.utcnow(), phone, username
            )
            print(f"✓ Password updated for existing user")
            user_id = existing
        else:
            # Create new user
            await conn.execute(
                """
                INSERT INTO auth.users (
                    id, username, phone, phone_verified,
                    nickname, password_hash, membership, status,
                    points, total_dialogues, total_uploads, login_count,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    $13, $14
                )
                """,
                user_id, username, phone, True,
                f"TestUser_{phone[-4:]}", password_hash, "free", "active",
                0, 0, 0, 0,
                datetime.utcnow(), datetime.utcnow()
            )
            print(f"✓ User created successfully with ID: {user_id}")

        # Create user profile if not exists
        profile_exists = await conn.fetchval(
            "SELECT user_id FROM auth.user_profiles WHERE user_id = $1",
            user_id
        )

        if not profile_exists:
            await conn.execute(
                """
                INSERT INTO auth.user_profiles (
                    user_id, language, timezone, notification_enabled,
                    email_verified, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7
                )
                """,
                user_id, "zh-CN", "Asia/Shanghai", True,
                False, datetime.utcnow(), datetime.utcnow()
            )
            print(f"✓ User profile created")

        print("\n" + "=" * 60)
        print("✅ Test user ready!")
        print(f"   Phone: {phone}")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   User ID: {user_id}")
        print("=" * 60)

        return {
            "user_id": str(user_id),
            "phone": phone,
            "username": username,
            "password": password
        }

    finally:
        await conn.close()

if __name__ == "__main__":
    result = asyncio.run(create_test_user())