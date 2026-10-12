import logging
from redis.asyncio import Redis, RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)


class SafeRedis:
    def __init__(self, url: str) -> None:
        self._client = Redis.from_url(url, decode_responses=True)

    async def get(self, name: str):
        try:
            return await self._client.get(name)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis get failed: %s", exc)
            return None

    async def setex(self, name: str, time: int, value: str):
        try:
            return await self._client.setex(name, time, value)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis setex failed: %s", exc)
            return None

    async def delete(self, *names: str):
        try:
            return await self._client.delete(*names)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis delete failed: %s", exc)
            return 0

    async def lrange(self, name: str, start: int, end: int):
        try:
            return await self._client.lrange(name, start, end)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis lrange failed: %s", exc)
            return []

    async def lpush(self, name: str, *values: str):
        try:
            return await self._client.lpush(name, *values)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis lpush failed: %s", exc)
            return 0

    async def ltrim(self, name: str, start: int, end: int):
        try:
            return await self._client.ltrim(name, start, end)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis ltrim failed: %s", exc)
            return None

    async def expire(self, name: str, time: int):
        try:
            return await self._client.expire(name, time)
        except (RedisError, OSError, Exception) as exc:
            logger.warning("Redis expire failed: %s", exc)
            return False

    async def ping(self):
        try:
            return await self._client.ping()
        except (RedisError, OSError, Exception):
            return False

    async def aclose(self) -> None:
        try:
            await self._client.aclose()
        except (RedisError, OSError, Exception):
            pass


redis_client = SafeRedis(settings.redis_url)


async def close_redis() -> None:
    await redis_client.aclose()
