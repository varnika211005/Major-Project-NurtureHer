import re
from collections.abc import Awaitable, Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

SUSPICIOUS_PATTERNS = [
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"\bUNION\b.+\bSELECT\b", re.IGNORECASE),
]


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        target = f"{request.url.path}?{request.url.query}"
        if any(pattern.search(target) for pattern in SUSPICIOUS_PATTERNS):
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": "Invalid request input"})
        return await call_next(request)

