#!/usr/bin/env python3
"""
Initialize admin user for InKnowing system
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from passlib.context import CryptContext

from config.settings import settings

# Use the same password context as AdminAuthService
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_table(session: AsyncSession):
    """Create admin table if not exists"""
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            status VARCHAR(20) DEFAULT 'active',
            permissions JSONB DEFAULT '[]',

            -- Security fields
            last_login TIMESTAMP,
            last_password_change TIMESTAMP,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            two_factor_secret VARCHAR(255),

            -- Profile fields
            display_name VARCHAR(100),
            avatar_url VARCHAR(500),
            phone VARCHAR(20),

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by UUID REFERENCES admins(id)
        )
    """))
    await session.commit()
    print("✓ Admin table created/verified")


async def create_admin_user(session: AsyncSession, username: str, password: str, email: str = None):
    """Create or update admin user"""
    # Hash password using passlib (compatible with AdminAuthService)
    password_hash = pwd_context.hash(password)

    # Check if admin exists
    result = await session.execute(
        text("SELECT id FROM admins WHERE username = :username"),
        {"username": username}
    )
    existing = result.fetchone()

    if existing:
        # Update existing admin
        await session.execute(
            text("""
                UPDATE admins
                SET password_hash = :password_hash,
                    email = :email,
                    is_active = true,
                    updated_at = CURRENT_TIMESTAMP
                WHERE username = :username
            """),
            {
                "username": username,
                "password_hash": password_hash,
                "email": email
            }
        )
        print(f"✓ Admin user '{username}' updated")
    else:
        # Create new admin
        await session.execute(
            text("""
                INSERT INTO admins (username, password_hash, email, role, status, display_name,
                                    permissions, last_password_change, failed_login_attempts)
                VALUES (:username, :password_hash, :email, 'super_admin', 'active', :username,
                        '[]'::jsonb, CURRENT_TIMESTAMP, 0)
            """),
            {
                "username": username,
                "password_hash": password_hash,
                "email": email
            }
        )
        print(f"✓ Admin user '{username}' created")

    await session.commit()


async def main():
    """Initialize admin users"""
    print("\n=== InKnowing Admin Initialization ===\n")

    # Create engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    # Create session factory
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # Create admin table
            await create_admin_table(session)

            # Create default admin user
            print("\nCreating default admin user...")
            await create_admin_user(
                session,
                username=settings.ADMIN_USERNAME,
                password=settings.ADMIN_PASSWORD,
                email="admin@inknowing.com"
            )

            # Create a super admin for development
            print("\nCreating super admin user...")
            await create_admin_user(
                session,
                username="super",
                password="super123",
                email="super@inknowing.com"
            )

            print("\n✓ Admin initialization complete!")
            print("\nYou can now login with:")
            print(f"  Username: {settings.ADMIN_USERNAME}")
            print(f"  Password: {settings.ADMIN_PASSWORD}")
            print("\nOr as super admin:")
            print(f"  Username: super")
            print(f"  Password: super123")

        except Exception as e:
            print(f"\n✗ Error during initialization: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())