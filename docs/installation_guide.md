# Installation Guide (Supplementary)

> This is a short supplementary reference. Use [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) for verified Windows/local setup and [`deployment_guide.md`](./deployment_guide.md) for production.

## Requirements

- Docker and Docker Compose, or
- Python 3.11, PostgreSQL 16, Redis 7, and Node.js 20.19+/22.12+ for a manual local stack

## Docker Development

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose -f docker-compose.yml up --build
```

Use the explicit `-f docker-compose.yml` here because the default `docker compose up` also loads `docker-compose.override.yml`, which switches the API to production startup and strict production configuration checks. The frontend still needs to run separately:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Local Python

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Point DATABASE_URL/SYNC_DATABASE_URL and Redis/Celery hosts at localhost
# after starting PostgreSQL 16 and Redis 7 locally or via Docker.
alembic upgrade head
$env:NURTUREHER_DEMO_PASSWORD = "<choose-a-local-demo-password>"
python scripts/seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Alembic does not use the SQLite fallback; it requires a reachable `SYNC_DATABASE_URL`. The seed script creates local demo accounts and prints the demo password. Never reuse demo credentials outside a local demonstration.

## Production

Use [`deployment_guide.md`](./deployment_guide.md) and [`production_infrastructure.md`](./production_infrastructure.md). Do not treat this short guide as a production checklist.
