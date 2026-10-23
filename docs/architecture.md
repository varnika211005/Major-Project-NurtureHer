# Architecture

NurtureHer is a full-stack maternal health application with a FastAPI backend, React/Vite frontend, PostgreSQL/Redis persistence, Celery background jobs, and a hybrid corpus/v1 RAG chat pipeline.

> Current as of the 2026-10-21 working tree. This is an engineering overview, not a clinical or production-readiness artifact.

## Runtime Components

- **Frontend:** React 18, TypeScript, Vite 8, Tailwind, React Router, React Query, installable PWA shell.
- **API:** FastAPI with middleware for request tracking, auth context, rate limiting, sanitization, audit logging, metrics, CORS, compression, and security headers.
- **Database:** PostgreSQL 16 via SQLAlchemy 2.0 async/asyncpg; conditional SQLite fallback for local smoke mode.
- **Cache/state:** Redis for refresh-token rotation state, chat memory, dashboard/response caches.
- **Jobs:** Celery worker and beat for alerts, notifications, and scheduled maintenance. The development override defines beat; the production Compose file currently defines a worker but no beat service.
- **AI:** Optional Gemini generation/translation; corpus retrieval with MiniLM embeddings and an evidence gate; v1 knowledge-base fallback.
- **Observability:** Prometheus metrics, optional Sentry, Grafana dashboards in production Compose.
- **HerReach:** optional Google Places lookup with a deep-link fallback.

## API Modules

Mounted under `/api/v1`: `auth`, `wellness`, `cycle`, `pcos`, `ppd`, `chat`, `caregiver`, `carecircle`, `doctor`, `herreach`, `nutrition`, `admin`, `notifications`.

Chat routes are authenticated but not role-gated; identity comes from the JWT. Doctor routes require doctor/admin; object access uses approved CareCircle consent. Admin routes are admin-only.

## Request Flow

1. Middleware applies request context, rate limiting, sanitization, audit, metrics, and CORS.
2. Routers validate Pydantic requests and enforce dependency-based role/portal checks.
3. Services apply ownership and consent checks, then business logic.
4. Repositories execute SQLAlchemy queries.
5. Celery handles slow/retryable notification and maintenance work.
6. The API returns structured responses; protected routes use bearer access tokens.

## Chat/RAG Flow

```text
safety gate -> language -> conversational intent -> translation
-> deterministic triage -> corpus retrieval + evidence gate
-> v1 fallback -> Gemini/local generation -> citation validation
-> disclaimer -> persistence -> best-effort escalation
```

Urgent/crisis matching precedes retrieval and generation. The LLM never decides emergency status. Corpus evidence is threshold-gated at `0.254`; v1 fallback uses a `0.30` threshold. See [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md) and [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md).

## Data

Core tables cover users/profiles, wellness records, cycles, screenings, chat, high-risk cases, alerts, refresh tokens, audit logs, CareCircle QR/access, doctor-patient links/notes, and nutrition profiles/plans/logs.

Alembic chain: `0001_initial` → `0002_production_indexes` → `0003_deactivate_asha_role` → `0004_add_carecircle_tables` → `0005_role_specific_nutrition`.

`data/rag_index/` holds the corpus index and is ignored by Git and Docker build context. Production must package it explicitly if corpus-backed retrieval is required.

## Frontend

- Public routes: `/login`, `/register`, `/internal/admin/login`, `/demo`, landing page.
- Role-aware protected routes cover mother, caregiver, doctor, and admin areas.
- `/demo` exposes mother/caregiver/doctor shortcuts only; admin uses the internal login.
- Token handling and API calls live in `frontend/src/lib/api.ts`.
- PWA service worker caches the app shell; API and clinical data remain online-only.

## Production Entrypoint

`app.production_main:app` imports the application and adds:

- security headers
- gzip compression
- cache middleware
- `/live` and `/ready`
- infrastructure metrics

Production startup uses `scripts/docker/start_api.sh`: run Alembic, run strict config audit with `REQUIRE_PRODUCTION_SECRETS=true`, optionally seed when `RUN_SEED_ON_STARTUP=true`, then start Gunicorn.

## Boundaries

- Screening and chatbot outputs are not diagnoses.
- Clinical, native-language, browser, and deployment validation remain incomplete.
- Safety templates and triage rules are pending clinical review.
- No architecture diagram or successful local run establishes regulatory compliance or production readiness.
