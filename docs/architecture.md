# Architecture

NurtureHer is a modular FastAPI backend organized by API routers, service classes, repositories, SQLAlchemy models, and infrastructure adapters.

## Runtime Components

- FastAPI serves REST APIs and middleware.
- PostgreSQL stores users, health records, AI predictions, alerts, audit logs, and sessions.
- Redis stores refresh token state, dashboard cache, response cache, and chat memory.
- Celery processes SMS alerts and scheduled maintenance tasks.
- Prometheus scrapes API and infrastructure metrics.
- Grafana visualizes operational dashboards.

## Request Flow

1. Middleware applies request tracking, authentication context, audit logging, sanitization, metrics, compression, and security headers.
2. Routers validate payloads with Pydantic schemas.
3. Services enforce business logic.
4. Repositories execute SQLAlchemy queries.
5. Background tasks are queued through Celery for slow or retryable operations.

## Production Entrypoint

`app.production_main:app` imports the existing application and adds production-only infrastructure:

- security headers
- gzip compression
- cache middleware
- readiness and liveness endpoints
- infrastructure metrics
