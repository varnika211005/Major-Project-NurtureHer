# Deployment Guide

## Local Production Run
Production Kubernetes manifests live under `deployment/k8s/`.

```sh
cp .env.example .env
docker compose up --build
```

The API is available at `http://localhost:8000`.

## Deployment Steps

1. Copy `.env.production.example` to `.env` and replace every placeholder secret.
2. Configure `BACKEND_CORS_ORIGINS` with trusted HTTPS frontend origins only.
3. Configure SMS credentials for the selected `SMS_PROVIDER`; production startup fails if they are missing.
4. Build containers with `docker compose -f docker-compose.prod.yml build`.
5. Start PostgreSQL and Redis with `docker compose -f docker-compose.prod.yml up -d db redis`.
6. Apply migrations with `docker compose -f docker-compose.prod.yml run --rm api sh scripts/ops/migrate.sh`.
7. Seed demo/baseline records only when intentionally needed with `docker compose -f docker-compose.prod.yml run --rm api sh scripts/ops/seed.sh`. Set `NURTUREHER_SEED_ADMIN_PASSWORD` first if the demo admin user should be created.
8. Start all services with `docker compose -f docker-compose.prod.yml up -d`.
9. Confirm liveness with `curl http://localhost/live` and readiness with `curl http://localhost/ready`.

Production containers run `scripts/docker/start_api.sh`, which applies Alembic migrations, performs a strict production config audit, and starts `app.production_main:app` with Gunicorn. Automatic seeding is disabled unless `RUN_SEED_ON_STARTUP=true` is explicitly set.

## Backups

Create a backup:

```sh
docker compose exec api sh scripts/ops/backup_db.sh
```

Restore from a backup:

```sh
docker compose exec -T api sh scripts/ops/restore_db.sh backups/file.sql
```

## Monitoring

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- API metrics: `http://localhost:8000/metrics`
- Infrastructure metrics: `http://localhost:8000/metrics/infra`
