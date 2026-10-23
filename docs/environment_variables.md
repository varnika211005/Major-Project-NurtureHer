# Environment Variables

> Name-level reference verified against `app/core/config.py`, frontend source, Compose files, and startup scripts on 2026-10-21. Never print or commit actual values. `.env` is intentionally ignored by Git.

## Backend Application

| Variable | Default/status | Notes |
| --- | --- | --- |
| `PROJECT_NAME` | `NurtureHer` | Display name |
| `ENVIRONMENT` | `development` | `development`, `staging`, or `production` |
| `API_V1_PREFIX` | `/api/v1` | Mounted API prefix |
| `BACKEND_CORS_ORIGINS` | local frontend origins | Comma-separated exact origins; wildcard is rejected by the production audit |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, or `ERROR` |
| `METRICS_ENABLED` | `true` | Enables Prometheus request metrics |
| `SENTRY_DSN` | empty | Optional Sentry DSN |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.05` | Sentry tracing rate |

## Database and Redis

| Variable | Default/status | Notes |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL async URL | Runtime database URL; `.env.example` uses Docker host `db` |
| `SYNC_DATABASE_URL` | PostgreSQL sync URL | Used by Alembic and backup/restore scripts; **no SQLite fallback** |
| `REDIS_URL` | `redis://localhost:6379/0` | Cache, memory, and refresh-token rotation state |
| `CELERY_BROKER_URL` | Redis DB 1 | Celery broker |
| `CELERY_RESULT_BACKEND` | Redis DB 2 | Celery result backend |

The app runtime can fall back to `sqlite+aiosqlite:///./nurtureher.db` only when the async URL contains `@db:` and Docker's `db` host is unresolved. Alembic uses `SYNC_DATABASE_URL` and does not implement that fallback.

## Authentication and Encryption

| Variable | Default/status | Notes |
| --- | --- | --- |
| `JWT_SECRET_KEY` | placeholder | Replace in production; high-entropy value required |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access-token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh-token lifetime |
| `ENCRYPTION_KEY` | placeholder | Application encryption key; production audit rejects placeholders |
| `REQUIRE_PRODUCTION_SECRETS` | unset/false | When `true`, `scripts/ops/check_production_config.py` exits non-zero on invalid production config; `start_api.sh` sets it to `true` |

## Seeding

| Variable | Default/status | Notes |
| --- | --- | --- |
| `RUN_SEED_ON_STARTUP` | `false` | Read by `scripts/docker/start_api.sh`; set `true` only for controlled demo startup |
| `NURTUREHER_DEMO_PASSWORD` | seed fallback exists | Password for the four seeded demo users. Never reuse it as a real credential; the seed script prints it |
| `NURTUREHER_SEED_ADMIN_PASSWORD` | **unused** | Referenced by older docs, but current `scripts/seed.py` does not read it. Do not rely on it |

## AI, HerReach, and Notifications

| Variable | Default/status | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | empty | Optional; without it the chat service uses a local templated response. A secret-like fragment was removed from the old README; rotate the provider key if it was real |
| `GEMINI_MODEL` | config default `gemini-1.5-flash`; example uses `gemini-3.6-flash` | Several legacy names, including `gemini-3.6-flash` and `gemini-1.5-flash`, are normalized to `gemini-3.5-flash-lite` in code |
| `GOOGLE_MAPS_API_KEY` | empty | Optional; enables live HerReach Google Places search. Currently absent from `.env.example` |
| `PCOS_MODEL_PATH` | `app/ml/artifacts/pcos_random_forest.pkl` | Serialized model path |
| `SMS_PROVIDER` | `twilio` | `twilio` or `fast2sms` |
| `TWILIO_ACCOUNT_SID` | empty | Twilio credential |
| `TWILIO_AUTH_TOKEN` | empty | Twilio credential |
| `TWILIO_FROM_NUMBER` | empty | Twilio sender |
| `FAST2SMS_API_KEY` | empty | Fast2SMS credential |

Production config validation rejects placeholder secrets, wildcard CORS, long access-token lifetimes, and missing SMS credentials for the selected provider. SMS without credentials is simulated in non-production and fails closed in production; real delivery also needs Celery worker/beat.

## Frontend

Frontend variables belong in `frontend/.env` or the build environment, not the backend `.env`.

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | API base URL |
| `VITE_DEMO_MOTHER_EMAIL` | built-in local demo email | Demo page only; do not put real patient email in the build |
| `VITE_DEMO_MOTHER_PASSWORD` | built-in demo fallback | Demo only; never a real credential |
| `VITE_DEMO_CAREGIVER_EMAIL` | built-in local demo email | Demo page only |
| `VITE_DEMO_CAREGIVER_PASSWORD` | built-in demo fallback | Demo only |
| `VITE_DEMO_DOCTOR_EMAIL` | built-in local demo email | Demo page only |
| `VITE_DEMO_DOCTOR_PASSWORD` | built-in demo fallback | Demo only |
| `VITE_BUILD_VERSION` | generated timestamp/base36 | Optional service-worker precache version |

There is no admin demo shortcut or admin demo env var. Admin login uses `/internal/admin/login`.

## Compose-Only Variables

| Variable | Notes |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Used by production Compose; `POSTGRES_PASSWORD` is required |
| `GRAFANA_ADMIN_PASSWORD` | Required by production Compose |

## Production Checklist

- Replace every placeholder in `.env.production.example`.
- Use exact HTTPS origins for CORS.
- Set strong JWT and encryption keys.
- Configure the selected SMS provider or accept that production SMS fails closed.
- Keep `RUN_SEED_ON_STARTUP` false unless operating an intentional demo environment.
- Supply the corpus/index explicitly if corpus-backed retrieval is required.
- Never commit `.env`, `frontend/.env`, or generated files containing credentials.

See [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) and [`deployment_guide.md`](./deployment_guide.md).
