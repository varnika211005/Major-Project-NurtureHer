import logging
from collections.abc import Awaitable, Callable
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import AsyncSessionLocal
from app.repositories.audit import AuditLogRepository

audit_logger = logging.getLogger("nurtureher.audit")

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        if request.method in AUDITED_METHODS:
            user_id = getattr(request.state, "user_id", None)
            audit_logger.info(
                "audit_event method=%s path=%s status=%s user_id=%s client=%s",
                request.method,
                request.url.path,
                response.status_code,
                user_id,
                request.client.host if request.client else None,
            )
            try:
                async with AsyncSessionLocal() as db:
                    await AuditLogRepository(db).create(
                        user_id=UUID(user_id) if user_id else None,
                        action=request.method,
                        resource=request.url.path,
                        ip_address=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                        metadata_json=f'{{"status_code": {response.status_code}}}',
                    )
                    await db.commit()
            except Exception:
                audit_logger.exception("Failed to persist audit log")
        return response
