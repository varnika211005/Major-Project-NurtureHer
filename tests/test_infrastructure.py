import pytest
from fastapi import Response
from starlette.requests import Request

from app.core.config import Settings
from app.infra.config_audit import audit_production_config
from app.infra.health import readiness
from app.infra.metrics import DB_UP, REDIS_CONNECTED_CLIENTS, REDIS_UP, collect_infrastructure_metrics
from app.infra.response_cache import ResponseCacheMiddleware
from app.infra.security_headers import SECURITY_HEADERS, SecurityHeadersMiddleware


def make_request(path: str = "/api/v1/caregiver/videos", method: str = "GET", query_string: bytes = b"", headers=None) -> Request:
    return Request(
        {
            "type": "http",
            "method": method,
            "path": path,
            "headers": headers or [],
            "query_string": query_string,
            "server": ("testserver", 80),
            "scheme": "http",
            "client": ("127.0.0.1", 123),
        }
    )


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        del ttl
        self.store[key] = value

    async def ping(self) -> bool:
        return True

    async def info(self) -> dict[str, int]:
        return {"connected_clients": 3}


class FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def execute(self, statement):
        return statement


@pytest.mark.asyncio
async def test_security_headers_middleware_adds_headers():
    middleware = SecurityHeadersMiddleware(app=None)

    async def call_next(request):
        del request
        return Response("ok")

    response = await middleware.dispatch(make_request("/health"), call_next)
    for header in SECURITY_HEADERS:
        assert header in response.headers
    assert response.headers["Strict-Transport-Security"].startswith("max-age=")


@pytest.mark.asyncio
async def test_response_cache_hits_and_misses(monkeypatch):
    fake_redis = FakeRedis()
    monkeypatch.setattr("app.infra.response_cache.redis_client", fake_redis)
    middleware = ResponseCacheMiddleware(app=None, ttl_seconds=30)
    request = make_request()

    async def call_next(_):
        response = Response('{"items":[]}', media_type="application/json")
        response.body = b'{"items":[]}'
        return response

    miss = await middleware.dispatch(request, call_next)
    assert miss.headers["X-Cache"] == "MISS"

    hit = await middleware.dispatch(request, call_next)
    assert hit.headers["X-Cache"] == "HIT"
    assert hit.body == b'{"items":[]}'


def test_response_cache_skips_authenticated_requests():
    middleware = ResponseCacheMiddleware(app=None)
    request = make_request(headers=[(b"authorization", b"Bearer token")])
    assert middleware._is_cacheable(request) is False


def test_config_audit_allows_development_defaults():
    result = audit_production_config(Settings(environment="development", jwt_secret_key="dev-only-change-this-secret"))
    assert result.ok is True


def test_config_audit_rejects_production_defaults():
    result = audit_production_config(
        Settings(
            environment="production",
            jwt_secret_key="change-me-in-production",
            encryption_key="change-me-32-byte-key-for-prod!!",
            database_url="postgresql+asyncpg://user:pass@localhost/db",
            redis_url="redis://localhost:6379/0",
        )
    )
    assert result.ok is False
    assert len(result.errors) >= 4


def test_config_audit_rejects_production_placeholders_and_wildcard_cors():
    result = audit_production_config(
        Settings(
            environment="production",
            jwt_secret_key="replace-with-long-random-secret",
            encryption_key="replace-with-long-random-encryption-secret",
            backend_cors_origins="*",
            database_url="postgresql+asyncpg://user:pass@db/prod",
            redis_url="redis://redis:6379/0",
        )
    )
    assert result.ok is False
    assert any("JWT_SECRET_KEY" in error for error in result.errors)
    assert any("ENCRYPTION_KEY" in error for error in result.errors)
    assert any("must not use '*'" in error for error in result.errors)


@pytest.mark.asyncio
async def test_readiness_success(monkeypatch):
    monkeypatch.setattr("app.infra.health.AsyncSessionLocal", lambda: FakeSession())
    monkeypatch.setattr("app.infra.health.redis_client", FakeRedis())
    response = await readiness()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_infrastructure_metrics_success(monkeypatch):
    monkeypatch.setattr("app.infra.metrics.AsyncSessionLocal", lambda: FakeSession())
    monkeypatch.setattr("app.infra.metrics.redis_client", FakeRedis())
    await collect_infrastructure_metrics()
    assert DB_UP._value.get() == 1
    assert REDIS_UP._value.get() == 1
    assert REDIS_CONNECTED_CLIENTS._value.get() == 3


def test_production_app_exposes_operational_routes():
    from app.production_main import app

    paths = {getattr(route, "path", "") for route in app.routes}
    assert "/ready" in paths
    assert "/live" in paths
    assert "/metrics/infra" in paths
