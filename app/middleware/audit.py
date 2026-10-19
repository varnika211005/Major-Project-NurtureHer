import json
import logging
from collections.abc import Awaitable, Callable
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import AsyncSessionLocal
from app.repositories.audit import AuditLogRepository

audit_logger = logging.getLogger("nurtureher.audit")

AUDITED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# GET paths that return sensitive user-specific or administrative records.
# Compared against the route portion of the path (leading "/api/v1" stripped
# when present). Entries ending in "/" are prefix matches; others match
# exactly or as a parent segment ("/doctor/patients" also covers timelines).
SENSITIVE_READ_PATHS = (
    "/chat/history",
    "/carecircle/requests",
    "/carecircle/connections",
    "/carecircle/shared-summary/",
    "/carecircle/chat-history/",
    "/doctor/patients",
    "/doctor/escalations",
    "/admin/users",
    "/notifications",
)

# Deliberately NOT audited: /admin/audit-logs (self-logging loop),
# /admin/dashboard|analytics (aggregate counts only), caregiver content
# catalog (public educational content, no PHI), /health, /metrics, /docs.


def _route_path(path: str) -> str:
    if path.startswith("/api/v1/"):
        return path[len("/api/v1") :]
    return path


def _is_audited_read(method: str, path: str) -> bool:
    """True for GET requests that read sensitive records. Pure function (unit-tested)."""
    if method != "GET":
        return False
    route = _route_path(path)
    for prefix in SENSITIVE_READ_PATHS:
        if prefix.endswith("/"):
            if route.startswith(prefix):
                return True
        elif route == prefix or route.startswith(prefix + "/"):
            return True
    return False


def _read_subject(route: str) -> str | None:
    """Best-effort subject identifier from the route (UUIDs only, never bodies)."""
    if "/shared-summary/" in route:
        return route.rsplit("/", 1)[-1] or None
    if route.endswith("/timeline"):
        parts = route.rsplit("/", 2)
        if len(parts) == 3:
            return parts[1] or None
    return None


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        path = request.url.path
        audited_read = _is_audited_read(request.method, path)
        if request.method in AUDITED_METHODS or audited_read:
            user_id = getattr(request.state, "user_id", None)
            metadata = {"status_code": response.status_code}
            if audited_read:
                # Subject where the route names one; never bodies, query strings, or tokens.
                subject = _read_subject(_route_path(path))
                if subject:
                    metadata["subject"] = subject
            audit_logger.info(
                "audit_event method=%s path=%s status=%s user_id=%s client=%s",
                request.method,
                path,
                response.status_code,
                user_id,
                request.client.host if request.client else None,
            )
            try:
                async with AsyncSessionLocal() as db:
                    await AuditLogRepository(db).create(
                        user_id=UUID(user_id) if user_id else None,
                        action=request.method,
                        resource=path,
                        ip_address=request.client.host if request.client else None,
                        user_agent=request.headers.get("user-agent"),
                        metadata_json=json.dumps(metadata),
                    )
                    await db.commit()
            except Exception:
                audit_logger.exception("Failed to persist audit log")
        return response
