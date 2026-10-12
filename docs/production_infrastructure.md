# Production Infrastructure

NurtureHer includes an additive production entrypoint at `app.production_main:app`.

## Security

- JWT access tokens and rotating refresh tokens are implemented in the application service layer.
- Passwords are hashed with Passlib bcrypt.
- SQL injection risk is reduced by SQLAlchemy parameterized queries and Pydantic validation.
- Input sanitization middleware blocks common script and SQL probe patterns.
- `app.production_main` adds security response headers and gzip compression.
- Production startup runs a strict configuration audit and fails on placeholder secrets, wildcard CORS, long-lived access tokens, or missing SMS credentials for the selected provider.
- RBAC is enforced through dependency injection and authorization middleware context.
- Audit logs are persisted for write operations.

## Performance

- PostgreSQL and Redis run with production-oriented Compose overrides.
- SQLAlchemy async engines use pooled connections and pre-ping.
- Redis is used for dashboard memory, conversation memory, and response caching.
- Celery workers handle SMS and scheduled background jobs.
- Pagination is available through shared query dependencies.
- Migration `0002_production_indexes` adds composite indexes for high-volume user timeline, alert, high-risk case, audit, and role lookup queries.
- Refresh token lookup and revoke-all paths use indexed SQL queries rather than full table scans.

## Monitoring

- `/health` returns basic service health.
- `/live` returns process liveness.
- `/ready` checks PostgreSQL and Redis.
- `/metrics` exposes request metrics.
- `/metrics/infra` refreshes database and Redis Prometheus gauges.

## Docker

`docker-compose.override.yml` is loaded automatically by Docker Compose and configures:

- production API startup through `scripts/docker/start_api.sh`
- Celery worker startup through `scripts/docker/start_worker.sh`
- Celery beat startup through `scripts/docker/start_beat.sh`
- API healthcheck against `/ready`
- Redis memory policy
- PostgreSQL connection and memory settings

Run:

```sh
docker compose up --build
```

Startup seeding is disabled by default. Use `RUN_SEED_ON_STARTUP=true` only for controlled demo environments.
