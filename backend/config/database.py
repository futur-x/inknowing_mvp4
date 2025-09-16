"""
Database configuration and session management
"""
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from config.settings import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=settings.DATABASE_POOL_PRE_PING,
    # Use NullPool for serverless/lambda deployments
    poolclass=NullPool if settings.ENVIRONMENT == "serverless" else None,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Create declarative base for models
Base = declarative_base()

# Metadata for existing tables
metadata = Base.metadata


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database (for testing purposes only)
    Note: We don't create tables as they already exist
    """
    async with engine.begin() as conn:
        # We can add any initialization logic here if needed
        # For now, we just test the connection
        await conn.execute(text("SELECT 1"))
        print("Database connection successful")


async def close_db() -> None:
    """
    Close database connection
    """
    await engine.dispose()