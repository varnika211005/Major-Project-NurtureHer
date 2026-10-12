import hashlib
import json
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from app.core.redis import redis_client


class ResponseCacheMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, ttl_seconds: int = 60, path_prefixes: tuple[str, ...] = ("/api/v1/caregiver",)) -> None:
        super().__init__(app)
        self.ttl_seconds = ttl_seconds
        self.path_prefixes = path_prefixes

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        if not self._is_cacheable(request):
            return await call_next(request)

        cache_key = self._cache_key(request)
        cached = await redis_client.get(cache_key)
        if cached:
            payload = json.loads(cached)
            return StarletteResponse(
                content=payload["body"].encode("utf-8"),
                media_type=payload["media_type"],
                headers={"X-Cache": "HIT"},
            )

        response = await call_next(request)
        if response.status_code == 200 and hasattr(response, "body"):
            media_type = response.media_type or response.headers.get("content-type", "application/json")
            body = response.body.decode("utf-8")
            await redis_client.setex(cache_key, self.ttl_seconds, json.dumps({"body": body, "media_type": media_type}))
            response.headers["X-Cache"] = "MISS"
        return response

    def _is_cacheable(self, request: Request) -> bool:
        if request.method != "GET" or request.headers.get("Authorization"):
            return False
        return any(request.url.path.startswith(prefix) for prefix in self.path_prefixes)

    def _cache_key(self, request: Request) -> str:
        raw = f"{request.method}:{request.url.path}:{request.url.query}"
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return f"response-cache:{digest}"
