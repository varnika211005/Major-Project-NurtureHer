# Production Readiness Report

Date: 2026-07-09

## Summary

NurtureHer was audited across backend, frontend, security, database, DevOps, monitoring, and documentation surfaces. Verified issues were fixed without changing product features, API contracts, backend integration, or project architecture.

## Issues Found

- Production Docker image started `app.main:app` instead of the hardened `app.production_main:app`.
- Production startup could continue after configuration warnings unless `REQUIRE_PRODUCTION_SECRETS` was manually set.
- Startup seed script always created demo users with hardcoded passwords.
- SMS providers simulated success when credentials were missing, including in production.
- Config audit did not reject `replace-with-*` production placeholders, wildcard CORS, long access-token lifetimes, or missing SMS provider credentials.
- Kubernetes readiness and liveness probes pointed to basic `/health` instead of dependency-aware `/ready` and process `/live`.
- Refresh-token lookup and revoke-all flows scanned all refresh-token records in Python.
- High-volume timeline, alert, audit, role lookup, and high-risk case queries lacked composite indexes for common production filters/orderings.
- Production Compose used weak fallback defaults for `POSTGRES_PASSWORD` and `GRAFANA_ADMIN_PASSWORD`.
- Repo hygiene was missing a `.gitignore` for `.env`, logs, caches, build artifacts, and local data volumes.

## Issues Fixed

- Updated `Dockerfile.prod` to run `scripts/docker/start_api.sh` and healthcheck `/ready`.
- Updated `scripts/docker/start_api.sh` to run strict production config checks and use `app.production_main:app`.
- Made startup seeding opt-in via `RUN_SEED_ON_STARTUP=true`.
- Removed hardcoded seed passwords; demo users require `NURTUREHER_SEED_ADMIN_PASSWORD`.
- Hardened `audit_production_config` for placeholder secrets, wildcard CORS, excessive access-token TTLs, and missing SMS credentials.
- Made SMS providers fail closed in production when credentials are missing.
- Updated auth dependency to return `401` for missing bearer credentials.
- Added indexed refresh-token repository lookups.
- Added Alembic migration `0002_production_indexes`.
- Updated Kubernetes probes to `/ready` and `/live`.
- Removed weak production Compose fallback secrets.
- Added `.gitignore` and updated `.dockerignore`.
- Regenerated `docs/openapi.json`.
- Updated README and operations docs.

## Performance Improvements

- Replaced refresh-token full table scans with indexed `token_jti` and active-user queries.
- Added composite indexes:
  - user timeline queries by `user_id, created_at`
  - alert status queries by `sent_status, created_at`
  - high-risk case status/risk queries by `status, created_at` and `risk_level, created_at`
  - audit log ordering by `created_at`
  - user role/active lookup by `role, is_active`
- Confirmed frontend lazy route splitting and production build are intact.

## Security Improvements

- Strict production secret validation now fails container startup.
- Production wildcard CORS is rejected.
- Production SMS sends fail closed without provider credentials.
- Hardcoded seed credentials removed.
- Missing auth credentials now return consistent `401`.
- Production Compose requires explicit database and Grafana secrets.
- `.env` and local runtime artifacts are ignored by Git and Docker build context.

## Validation Results

- `ruff check .`: passed.
- `pytest -q`: passed, 31 tests, coverage 82.65%.
- `python -m compileall app scripts tests`: passed.
- `python scripts/ops/generate_openapi.py`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=high`: passed, 0 vulnerabilities.
- Alembic metadata: head is `0002_production_indexes`.
- Strict config audit:
  - unsafe placeholders/wildcard CORS: failed as expected.
  - realistic production values: passed.

## Deployment Status

Application code, migrations, frontend build, OpenAPI generation, and production configuration checks are deployment-ready.

## Remaining Blockers

- Docker CLI is not installed in this execution environment, so `docker compose config` and image builds could not be run here.
- `python -m pip check` reports conflicts in the shared local interpreter from packages outside the project pin set (`opencv-python`, `tensorflow`, and an installed `faiss-cpu` version against local `numpy 1.24.3`). The project `requirements.txt` pins `numpy==1.26.4` and `faiss-cpu==1.8.0.post1`; production images install from `requirements.txt`, so use a clean virtual environment or container build for final dependency verification.
