"""
Simple cache manager for monitoring services
"""
import asyncio
from typing import Any, Optional
from datetime import datetime, timedelta


class SimpleCacheManager:
    """Simple in-memory cache manager"""

    def __init__(self):
        self._cache = {}
        self._expiry = {}

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self._cache:
            # Check if expired
            if key in self._expiry and datetime.utcnow() > self._expiry[key]:
                del self._cache[key]
                del self._expiry[key]
                return None
            return self._cache[key]
        return None

    async def set(self, key: str, value: Any, expire: int = 3600) -> None:
        """Set value in cache with expiration"""
        self._cache[key] = value
        if expire > 0:
            self._expiry[key] = datetime.utcnow() + timedelta(seconds=expire)

    async def incr(self, key: str, amount: int = 1) -> int:
        """Increment counter in cache"""
        current = await self.get(key) or 0
        new_value = current + amount
        await self.set(key, new_value)
        return new_value

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        return False

    async def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()
        self._expiry.clear()


# Global cache manager instance
cache_manager = SimpleCacheManager()