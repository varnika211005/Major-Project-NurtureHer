from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.redis import close_redis
from app.middleware.auth import AuthenticationContextMiddleware
from app.middleware.audit import AuditLoggingMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_tracking import RequestTrackingMiddleware
from app.middleware.sanitization import InputSanitizationMiddleware
from app.monitoring.metrics import PrometheusMetricsMiddleware, metrics_response
from app.utils.logging import configure_logging

configure_logging(settings.log_level)
if settings.sentry_dsn:
    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=settings.sentry_traces_sample_rate, environment=settings.environment)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


from app.core.database import Base, engine, ensure_sqlite_schema
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(ensure_sqlite_schema)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Database initialization in lifespan warning: %s", exc)
    yield
    await close_redis()


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description="Production-ready backend for AI-powered women's health workflows.",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
if settings.metrics_enabled:
    app.add_middleware(PrometheusMetricsMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RequestTrackingMiddleware)
app.add_middleware(AuthenticationContextMiddleware)
app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(InputSanitizationMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", tags=["Health"])
@limiter.limit("20/minute")
async def root(request: Request):
    return {"service": settings.project_name, "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"service": settings.project_name, "status": "healthy"}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return await metrics_response()
