import json
from uuid import UUID

from app.core.redis import redis_client


class ConversationMemoryService:
    def __init__(self, ttl_seconds: int = 3600) -> None:
        self.ttl_seconds = ttl_seconds

    async def get_recent_messages(self, user_id: UUID, limit: int = 6) -> list[dict[str, str]]:
        raw = await redis_client.lrange(self._key(user_id), 0, limit - 1)
        return [json.loads(item) for item in raw]

    async def append(self, user_id: UUID, message: str, response: str) -> None:
        key = self._key(user_id)
        await redis_client.lpush(key, json.dumps({"message": message, "response": response}))
        await redis_client.ltrim(key, 0, 19)
        await redis_client.expire(key, self.ttl_seconds)

    def _key(self, user_id: UUID) -> str:
        return f"chat-memory:{user_id}"

