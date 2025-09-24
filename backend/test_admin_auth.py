#!/usr/bin/env python3
"""
Test admin authentication service directly
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from backend.services.admin_auth import AdminAuthService
from backend.config.settings import settings


async def test_admin_auth():
    """Test admin authentication"""
    # Create engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    # Create session factory
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        auth_service = AdminAuthService(session)

        # Test authentication
        print("Testing admin authentication...")
        print(f"Username: admin")
        print(f"Password: admin123")

        try:
            admin = await auth_service.authenticate_admin(
                username="admin",
                password="admin123",
                ip_address="127.0.0.1",
                user_agent="Test Script"
            )

            if admin:
                print(f"\n✓ Authentication successful!")
                print(f"  Admin ID: {admin.id}")
                print(f"  Username: {admin.username}")
                print(f"  Role: {admin.role}")
                print(f"  Status: {admin.status}")

                # Create tokens
                tokens = await auth_service.create_admin_tokens(admin)
                print(f"\n✓ Tokens created!")
                print(f"  Access Token: {tokens['access_token'][:50]}...")
            else:
                print("\n✗ Authentication failed: No admin returned")

        except Exception as e:
            print(f"\n✗ Authentication failed with error:")
            print(f"  Type: {type(e).__name__}")
            print(f"  Message: {str(e)}")
            import traceback
            traceback.print_exc()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_admin_auth())