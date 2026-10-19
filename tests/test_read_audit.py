"""Phase 1: read-access audit logging + chat-history consent default.

No external services: predicate tests are pure; dispatch tests run the real
middleware against an in-memory SQLite database with a stubbed session
factory. No message bodies, query strings, or tokens are ever persisted.
"""

import json
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request
from starlette.responses import Response

import app.middleware.audit as audit_module
from app.middleware.audit import _is_audited_read, _read_subject, _route_path
from app.models.audit import AuditLog
from app.models.carecircle import CareCircleAccess
from tests.conftest import make_chat_user


def _request(method: str, path: str, user_id: str | None = None, query: bytes = b"") -> Request:
    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "query_string": query,
        "headers": [(b"user-agent", b"pytest")],
        "client": ("127.0.0.1", 5000),
        "server": ("testserver", 80),
        "scheme": "http",
    }
    request = Request(scope)
    if user_id is not None:
        request.state.user_id = user_id
    return request


async def _ok(_request: Request) -> Response:
    return Response("ok", status_code=200)


async def _denied(_request: Request) -> Response:
    return Response("denied", status_code=403)


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/chat/history",
        "/api/v1/carecircle/requests",
        "/api/v1/carecircle/connections",
        "/api/v1/carecircle/shared-summary/abc123",
        "/api/v1/doctor/patients",
        "/api/v1/doctor/patients/some-id/timeline",
        "/api/v1/admin/users",
        "/api/v1/notifications",
        "/chat/history",
    ],
)
def test_audited_read_paths(path):
    assert _is_audited_read("GET", path) is True


@pytest.mark.parametrize(
    "method,path",
    [
        ("POST", "/api/v1/chat/history"),
        ("GET", "/health"),
        ("GET", "/metrics"),
        ("GET", "/docs"),
        ("GET", "/api/v1/admin/audit-logs"),
        ("GET", "/api/v1/admin/dashboard"),
        ("GET", "/api/v1/admin/analytics"),
        ("GET", "/api/v1/caregiver/videos"),
        ("GET", "/api/v1/caregiver/content/xyz"),
        ("GET", "/api/v1/doctor/patientsXYZ"),
        ("GET", "/api/v1/chat/historyX"),
        ("GET", "/api/v1/notificationsX"),
    ],
)
def test_non_audited_read_paths(method, path):
    assert _is_audited_read(method, path) is False


def test_route_path_and_subject_extraction():
    assert _route_path("/api/v1/chat/history") == "/chat/history"
    assert _route_path("/chat/history") == "/chat/history"
    assert _read_subject("/carecircle/shared-summary/abc123") == "abc123"
    assert _read_subject("/doctor/patients/pid-1/timeline") == "pid-1"
    assert _read_subject("/chat/history") is None


async def _run_dispatch(monkeypatch, method, path, user_id, handler, query=b""):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(AuditLog.__table__.create)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(audit_module, "AsyncSessionLocal", factory)
    middleware = audit_module.AuditLoggingMiddleware(app=None)
    request = _request(method, path, user_id=user_id, query=query)
    response = await middleware.dispatch(request, handler)
    async with factory() as session:
        rows = (await session.execute(select(AuditLog))).scalars().all()
    await engine.dispose()
    return response, rows


async def test_dispatch_audits_sensitive_get(monkeypatch):
    user_id = str(uuid.uuid4())
    response, rows = await _run_dispatch(
        monkeypatch, "GET", "/api/v1/chat/history", user_id, _ok
    )
    assert response.status_code == 200
    assert len(rows) == 1
    row = rows[0]
    assert str(row.user_id) == user_id
    assert row.action == "GET"
    assert row.resource == "/api/v1/chat/history"
    metadata = json.loads(row.metadata_json)
    assert metadata["status_code"] == 200
    assert "subject" not in metadata


async def test_dispatch_audits_denied_read_with_subject(monkeypatch):
    user_id = str(uuid.uuid4())
    access_id = str(uuid.uuid4())
    response, rows = await _run_dispatch(
        monkeypatch,
        "GET",
        f"/api/v1/carecircle/shared-summary/{access_id}",
        user_id,
        _denied,
    )
    assert response.status_code == 403
    assert len(rows) == 1
    metadata = json.loads(rows[0].metadata_json)
    assert metadata == {"status_code": 403, "subject": access_id}


async def test_dispatch_ignores_non_sensitive_get(monkeypatch):
    response, rows = await _run_dispatch(
        monkeypatch, "GET", "/health", str(uuid.uuid4()), _ok
    )
    assert response.status_code == 200
    assert rows == []


async def test_dispatch_never_logs_query_or_tokens(monkeypatch):
    response, rows = await _run_dispatch(
        monkeypatch,
        "GET",
        "/api/v1/chat/history",
        str(uuid.uuid4()),
        _ok,
        query=b"token=secret-abc&limit=50",
    )
    assert response.status_code == 200
    assert len(rows) == 1
    row = rows[0]
    assert row.resource == "/api/v1/chat/history"
    assert "secret-abc" not in row.resource
    assert "secret-abc" not in (row.metadata_json or "")
    assert "limit" not in (row.metadata_json or "")


async def test_share_chat_history_defaults_false(db_session):
    mother = await make_chat_user(db_session, email="scope-mother@example.com")
    requester = await make_chat_user(db_session, email="scope-req@example.com")
    access = CareCircleAccess(user_id=mother.id, requester_id=requester.id)
    db_session.add(access)
    await db_session.commit()
    await db_session.refresh(access)
    assert access.share_chat_history is False
    assert access.share_emergency is True
    assert access.share_risk_category is True
    assert access.share_wellness_summary is True
    assert access.share_doctor_notes is False
