#!/usr/bin/env python3
"""
Create initial admin account for InKnowing
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.database import get_db, init_db
from backend.models.admin import Admin, AdminRole, AdminStatus
from backend.core.security import get_password_hash
from sqlmodel import select
from datetime import datetime
import uuid


async def create_admin():
    """Create default admin account"""
    # Initialize database
    await init_db()

    async for db in get_db():
        try:
            # Check if admin already exists
            stmt = select(Admin).where(Admin.username == "admin")
            result = await db.execute(stmt)
            existing_admin = result.scalar_one_or_none()

            if existing_admin:
                print("Admin user 'admin' already exists")
                # Update password if needed
                existing_admin.password_hash = get_password_hash("admin123")
                existing_admin.status = "active"
                existing_admin.role = "super_admin"
                await db.commit()
                print("Admin password has been reset to: admin123")
            else:
                # Create new admin
                admin = Admin(
                    id=str(uuid.uuid4()),
                    username="admin",
                    email="admin@inknowing.com",
                    password_hash=get_password_hash("admin123"),
                    role="super_admin",
                    status="active",
                    permissions=["*"],  # All permissions
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )

                db.add(admin)
                await db.commit()

                print("Admin account created successfully!")
                print("Username: admin")
                print("Password: admin123")
                print("Role: SUPER_ADMIN")

        except Exception as e:
            print(f"Error creating admin: {e}")
            await db.rollback()
        finally:
            break  # Exit after first iteration


if __name__ == "__main__":
    asyncio.run(create_admin())