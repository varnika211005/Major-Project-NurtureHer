# Deployment Guide

## Production Compose Run
Production Kubernetes manifests live under `deployment/k8s/`.

Use the production Compose file explicitly so the development override is not loaded:

```sh
cp .env.production.example .env
docker compose -f docker-compose.prod.yml up --build -d
```

Replace every placeholder secret before starting. Nginx exposes the API on port 80; Prometheus is on `9090` and Grafana on `3000`.

The production Compose file includes nginx, API, worker, PostgreSQL, Redis, Prometheus, and Grafana. It does **not** define a Celery beat service; confirm scheduled-job coverage before relying on beat-dependent tasks in production.

## Deployment Steps

1. Copy `.env.production.example` to `.env` and replace every placeholder secret.
2. Configure `BACKEND_CORS_ORIGINS` with trusted HTTPS frontend origins only.
3. Configure SMS credentials for the selected `SMS_PROVIDER`; production startup fails if they are missing.
4. Build containers with `docker compose -f docker-compose.prod.yml build`.
5. Start PostgreSQL and Redis with `docker compose -f docker-compose.prod.yml up -d db redis`.
6. Apply migrations with `docker compose -f docker-compose.prod.yml run --rm api sh scripts/ops/migrate.sh`.
7. Seed demo/baseline records only in a controlled demonstration environment with `docker compose -f docker-compose.prod.yml run --rm api sh scripts/ops/seed.sh`. Set `NURTUREHER_DEMO_PASSWORD` for the seeded accounts; the seed script prints that password. Do not use demo seeding for a real clinical deployment.
8. Start all services with `docker compose -f docker-compose.prod.yml up -d`.
9. Confirm liveness with `curl http://localhost/live` and readiness with `curl http://localhost/ready`.

Production containers run `scripts/docker/start_api.sh`, which applies Alembic migrations, performs a strict production config audit, and starts `app.production_main:app` with Gunicorn. Automatic seeding is disabled unless `RUN_SEED_ON_STARTUP=true` is explicitly set.

## Backups

Create a backup:

```sh
docker compose -f docker-compose.prod.yml exec api sh scripts/ops/backup_db.sh
```

Restore from a backup:

```sh
docker compose -f docker-compose.prod.yml exec -T api sh scripts/ops/restore_db.sh backups/file.sql
```

Backups are written inside the API container's volume context by default (`backups/`). Confirm the path is on persistent/shared storage and copy it off-host according to the deployment's retention policy.

## Monitoring

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- API metrics through nginx: `http://localhost/metrics`
- Infrastructure metrics through nginx: `http://localhost/metrics/infra`

The production Compose API uses `expose` rather than a host port; use nginx or an internal network to reach the API. Port 8000 is exposed directly in the development Compose file only.
