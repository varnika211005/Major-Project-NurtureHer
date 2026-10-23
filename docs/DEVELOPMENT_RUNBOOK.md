# Development Runbook

> Verified against the repository on 2026-10-21. Commands are written for Windows PowerShell unless noted. Never print `.env` values or commit secrets.

## 1. What This Runbook Covers

- Local backend and frontend setup
- Docker development versus production-mode behavior
- Database, Alembic, and seed behavior
- Focused test commands
- RAG/data prerequisites
- Common failure modes

Clinical content, production approval, and live AI quality are out of scope.

## 2. Prerequisites

| Tool | Requirement | Notes |
| --- | --- | --- |
| Python | 3.11 recommended | Docker image uses 3.11; 3.12 is not verified |
| Node.js | 20.19+ or 22.12+ | Required by Vite 8 |
| npm | Included with Node | `package-lock.json` is present |
| PostgreSQL | 16 | Full database mode |
| Redis | 7 | Refresh-token rotation, chat memory, caches |
| Docker Desktop | Current version | Optional for dependency containers |
| Git | Current version | Read-only Git commands are used in this runbook |

Create and activate a virtual environment from the repository root:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The requirements include a CPU build of PyTorch for the sentence-transformer stack. The first install/download can be large.

## 3. Environment Setup

`.env` is read by the backend. `.env.example` is the template. The example values use Docker service hostnames:

- `DATABASE_URL` and `SYNC_DATABASE_URL` use `@db:5432`
- `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND` use `redis`

If the backend runs on the host while dependencies run in Docker, change those hostnames to `localhost`. Do not copy the example into an existing `.env` and overwrite local work.

Important variable groups:

| Area | Variables |
| --- | --- |
| App/CORS | `PROJECT_NAME`, `ENVIRONMENT`, `API_V1_PREFIX`, `BACKEND_CORS_ORIGINS` |
| Database | `DATABASE_URL`, `SYNC_DATABASE_URL` |
| Redis/Celery | `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` |
| Auth | `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `ENCRYPTION_KEY` |
| AI | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| HerReach | `GOOGLE_MAPS_API_KEY` (not currently in `.env.example`) |
| SMS | `SMS_PROVIDER`, `TWILIO_*`, `FAST2SMS_API_KEY` |
| Observability | `METRICS_ENABLED`, `LOG_LEVEL`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` |
| Seed | `NURTUREHER_DEMO_PASSWORD`, `RUN_SEED_ON_STARTUP` |
| Frontend | `VITE_API_BASE_URL`, `VITE_DEMO_*` |

Notes:

- `GEMINI_API_KEY` is optional for startup, but the service uses a local fallback response when it is absent.
- `GOOGLE_MAPS_API_KEY` is optional; HerReach degrades to Google Maps deep links without it.
- `NURTUREHER_SEED_ADMIN_PASSWORD` is referenced by old documentation but is not used by the current seed script.
- `NURTUREHER_DEMO_PASSWORD` controls all seeded demo users. The seed script has an internal default and prints the password; that default is a local-demo risk, not a production credential.
- Do not run `Get-Content .env` for troubleshooting in a shared terminal. Report variable names, not values.

See [`environment_variables.md`](./environment_variables.md) for the full reference.

## 4. Option A: Local Backend with Docker Dependencies

This is the preferred debugging setup.

```powershell
docker compose -f docker-compose.yml up -d db redis
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env so database hosts use localhost and Redis/Celery use localhost.
alembic upgrade head
$env:NURTUREHER_DEMO_PASSWORD = "<choose-a-local-demo-password>"
python scripts/seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Why not just run `alembic` with the unchanged example file? Alembic uses `SYNC_DATABASE_URL` and does not implement the app's SQLite fallback. With an unreachable `db` hostname, migrations fail even though the app might later fall back to SQLite.

Useful service URLs:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 5. Option B: Full Docker Development Stack

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose -f docker-compose.yml up --build
```

This explicitly excludes `docker-compose.override.yml`. The base API container runs Alembic and Uvicorn. The stack contains `api`, `worker`, `db`, and `redis`; it does not include beat, nginx, Prometheus, or Grafana.

The frontend is not served by this Compose stack. Run Vite separately and point `VITE_API_BASE_URL` at the API.

### Warning: default Compose includes the override

Running `docker compose up --build` auto-loads `docker-compose.override.yml`, which:

- sets `ENVIRONMENT=production`,
- runs `scripts/docker/start_api.sh` and the production worker/beat scripts,
- runs a strict production configuration check with `REQUIRE_PRODUCTION_SECRETS=true`,
- uses `/ready` for the API healthcheck.

It is not a plug-and-play development mode. Use the explicit `-f docker-compose.yml` command above for local development, or provide valid production-style secrets for an intentional production-mode test.

Production stack:

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

Read [`deployment_guide.md`](./deployment_guide.md) and [`production_infrastructure.md`](./production_infrastructure.md) first.

## 6. Option C: SQLite Smoke Mode

The backend falls back to `sqlite+aiosqlite:///./nurtureher.db` only when the configured database URL contains `@db:` and the hostname `db` cannot be resolved. This is useful for a quick local smoke test, not for development parity or production.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$env:NURTUREHER_DEMO_PASSWORD = "<choose-a-local-demo-password>"
python scripts/seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The app lifespan and seed script call `Base.metadata.create_all` and a small SQLite compatibility shim. Alembic still targets `SYNC_DATABASE_URL`; do not expect `alembic upgrade head` to work against this fallback.

Limitations:

- SQLite is not a production database and does not prove PostgreSQL behavior.
- Redis may be unavailable; the app tolerates some cache failures, but refresh-token rotation and chat memory degrade or fail. Start Redis for auth/chat testing.
- Schema drift is possible because `create_all` and Alembic are different paths.
- Do not use this mode to validate migrations or concurrency.

## 7. Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

Default API base: `http://localhost:8000/api/v1`. Override with `VITE_API_BASE_URL` if the API runs elsewhere.

Quality checks:

```powershell
npm run test
npx tsc -b
npm run lint
npm run build
npm run preview
```

`npm run build` runs TypeScript and Vite, and emits `sw-precache.js` for the hand-written service worker. `npm run preview` serves the production build for PWA inspection.

## 8. Database, Migrations, and Seed

### Migration workflow

```powershell
alembic current
alembic history
alembic upgrade head
```

Current chain:

1. `0001_initial`
2. `0002_production_indexes`
3. `0003_deactivate_asha_role`
4. `0004_add_carecircle_tables`
5. `0005_role_specific_nutrition`

Do not create a new migration or downgrade a shared database as part of routine setup. Preserve recovery steps in [`migration_strategy.md`](./migration_strategy.md).

### Seed behavior

`python scripts/seed.py`:

- creates tables via `create_all` and runs the SQLite compatibility shim,
- creates verified, active demo users for mother, doctor, caregiver, and admin,
- seeds sample wellness, screening, CareCircle, caregiver, and nutrition content,
- prints the demo password to stdout,
- does not update an existing user's password or role,
- is not required for a non-demo deployment.

Use a locally chosen `NURTUREHER_DEMO_PASSWORD`. Never reuse demo credentials outside a local demonstration. Production startup seeds only when `RUN_SEED_ON_STARTUP=true`; the production API script also requires strict config validation.

## 9. Tests and Lint

Backend:

```powershell
python -m pytest -q
python -m ruff check .
```

The repository-wide pytest configuration enforces `--cov-fail-under=80`. Coverage configuration omits several layers, so the gate is not evidence of full-system coverage.

Focused checks without loading the whole suite or enforcing the gate:

```powershell
python -m pytest tests/test_auth_portals.py tests/test_chat_corpus_integration.py --no-cov -p no:cacheprovider -q
```

Frontend:

```powershell
Set-Location frontend
npm run test
npx tsc -b
npm run lint
npm run build
```

Do not disable or skip failing tests to force a green result. Do not run the complete suite, model downloads, or corpus ingestion merely to verify a documentation change.

## 10. RAG and Data Prerequisites

The current index artifacts are expected under `data/rag_index/`:

- `manifest.json`
- `chunks.json`
- `vectors.npy`

Current verified snapshot: 1,167 chunks, 384-dimensional MiniLM vectors, threshold `0.254`, 6 source documents with 5 eligible and 1 quarantined. Source PDFs live under `data/medical_corpus/`.

`data/` is ignored by Git and `.dockerignore`. A fresh clone or production image may not contain the corpus/index. The chat service falls back to the v1 knowledge base when corpus evidence is unavailable, but that fallback is not a substitute for packaging the intended corpus. See [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md).

Do not run ingestion or embedding generation unless the task explicitly requires it; they are expensive and can rewrite artifacts.

## 11. PWA Verification

```powershell
Set-Location frontend
npm run build
npm run preview
```

Open the preview URL, confirm the manifest and `sw-precache.js` load, then verify that API requests are not served from cache. The service worker caches the app shell only and intentionally ignores `/api/` and cross-origin traffic. Offline clinical data and chat are unsupported.

Service-worker changes require a reload/update cycle and may need old registrations cleared in DevTools. Do not test PWA behavior through the Vite dev server alone.

## 12. Troubleshooting

| Symptom | Likely cause | Safe response |
| --- | --- | --- |
| `alembic` cannot connect to `db` | `.env` still uses Docker hostname while running on host | Change DB hosts to `localhost`; start Compose `db` |
| Login succeeds but refresh fails | Redis unavailable or token state lost | Start Redis; do not disable rotation in source for convenience |
| Doctor gets 403 | `is_verified=false` or portal mismatch | Verify the account through an admin flow; check portal |
| Doctor gets 404 for a patient | No approved, unrevoked CareCircle access | Have the mother approve access; do not bypass with `DoctorPatient` |
| Demo login fails | Seed not run, demo password overridden, or account exists with another password | Re-seed in a disposable local DB or use the configured demo password locally |
| CORS error | Origin not in `BACKEND_CORS_ORIGINS` | Add the exact local origin; do not use wildcard for production |
| Chat has no corpus citations | Missing index, evidence gate failed, or v1 fallback | Inspect logs and manifest; do not lower thresholds without approval |
| PWA serves stale assets | Old service worker/cache | Use preview, clear site data, reload |
| Frontend cannot reach API | Wrong `VITE_API_BASE_URL` or API not on 8000 | Check the browser network tab and API port |
| Port 5432/6379 in use | Existing local PostgreSQL/Redis | Stop the conflicting service or use another port and update `.env` |

## 13. Safe Working Rules

- Do not read `.env` aloud, print its values, or commit it.
- Do not reset the database, apply the safety stash, or run destructive Docker volume commands without explicit approval.
- Do not modify source or configuration to work around a setup problem unless the task authorizes it.
- Preserve uncommitted work; check `git status --short` before and after.
- Run focused checks and report exactly what was and was not executed.
- No clinical-validation, compliance, or production-readiness claims from a successful local run.

## 14. Related Documents

- [`README.md`](./README.md)
- [`environment_variables.md`](./environment_variables.md)
- [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md)
- [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md)
- [`deployment_guide.md`](./deployment_guide.md)
- [`production_infrastructure.md`](./production_infrastructure.md)
- [`migration_strategy.md`](./migration_strategy.md)
- [`PWA.md`](./PWA.md)
- [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md)
