# NurtureHer Project Memory (Canonical Handover)

> **Last verified:** 2026-10-21. **Authority:** repository code and artifacts are authoritative; this document is an orientation and recovery record. Do not claim clinical validation, diagnostic accuracy, regulatory compliance, or production readiness.
>
> **Evidence labels:** **verified-in-repo** (read from current source or artifacts), **previously-reported** (earlier session/report, not rerun), **historical** (preserved earlier state), **planned** (not implemented), **unverified** (not confirmed).
>
> **Documentation entry point:** [`docs/README.md`](./README.md). **RAG detail:** [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md) and [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md). **Auth:** [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md). **Setup:** [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md).

## 1. Current Verified Snapshot

- **Branch:** `integration/gayathri-features` (verified in-repo).
- **HEAD:** `a1d9832` — `feat: integrate Gayathri features and reconcile RAG and migrations`, dated 2026-10-19.
- **Git history:** 8 commits reachable from HEAD. Older statements about a single commit are historical.
- **Working tree:** at the start of this documentation audit, 104 porcelain entries: 76 modified and 28 untracked, nothing staged. The documentation pass intentionally adds and updates files; recheck live status before relying on counts.
- **Safety stash:** `stash@{0}` — `safety-backup-before-gayathri-integration-2026-10-18`. Preserve it; do not drop or apply it without explicit instruction.
- **Documentation state:** this pack is uncommitted. `docs/README.md`, `AUTH_AND_RBAC.md`, `DEVELOPMENT_RUNBOOK.md`, and `IMPLEMENTATION_STATUS.md` are new in this pass; other docs are updated in place.
- **Secret redaction:** an older root README contained a secret-like, 16-character truncated Gemini key fragment ending in an ellipsis. It was not a complete key, but it may have been a prefix of a real credential. It has been removed from the README and is not reproduced in documentation. If it corresponded to a real key, revoke/rotate it through the provider. Rotation was not performed as part of this documentation task.
- **Servable paths:** corpus-first RAG with v1 knowledge-base fallback; FastAPI API under `/api/v1`; React/Vite frontend; PostgreSQL/Redis/Celery infrastructure. Demo `/demo` page exposes mother, caregiver, and doctor shortcuts only; admin uses `/internal/admin/login`.

## 2. Product Purpose and Scope

NurtureHer is a maternal and women's health platform for:

- mothers tracking mood, symptoms, cycles, journals, nutrition, and hydration;
- PCOS and PPD screening support with non-diagnostic risk outputs;
- caregivers supporting a mother through consent-filtered CareCircle access;
- doctors viewing consent-authorized patients, timelines, notes, chat history, and nutrition plans;
- administrators managing accounts, audit-log viewing, and aggregate operational summaries;
- HerReach facility search and public helpline information.

The application includes a safety-first AI health coach. It is not a diagnostic system, emergency dispatcher, prescribing system, or substitute for clinicians. The ASHA Worker role was removed; legacy rows are handled conservatively by migration and lookup guards.

## 3. Current Architecture

### Frontend

- React 18.3.1, TypeScript, Vite 8.1.3, Tailwind CSS, Radix/shadcn-style components, React Router 6, React Query.
- Entry at `frontend/src/main.tsx`; authenticated shell at `frontend/src/layout/AppShell.tsx`.
- Public routes: `/login`, `/register`, `/internal/admin/login`, `/demo`, and the landing page fallback.
- Role-aware routes exist for doctor, admin, mother, and caregiver; several shared pages are available to any authenticated user.
- `/chat-history` is declared twice in `frontend/src/App.tsx`: first as `ChatHistoryPage`, later as a `Navigate` to `/coach?history=1`. Treat this as a known routing inconsistency until verified in a browser; do not assume the redirect is active.
- API client: `frontend/src/lib/api.ts`, base `VITE_API_BASE_URL` defaulting to `http://localhost:8000/api/v1`.
- PWA: manifest and hand-written service worker; production build emits `sw-precache.js`. API responses and clinical data are not cached offline.
- Known UI issue: the closed mobile top bar does not show the brand mark; the sidebar/drawer carries branding. This is a cosmetic issue, not an auth or data-access issue.

### Backend

- FastAPI 0.111, Python 3.11 target, SQLAlchemy 2.0 async, Pydantic v2, Alembic.
- Main app: `app/main.py`; production app: `app/production_main.py`.
- Mounted routers: `auth`, `wellness`, `cycle`, `pcos`, `ppd`, `chat`, `caregiver`, `carecircle`, `doctor`, `herreach`, `nutrition`, `admin`, `notifications`.
- Middleware includes rate limiting, request tracking, auth context, audit logging, input sanitization, CORS, metrics, and logging. Production entrypoint adds gzip, security headers, readiness/liveness, and infrastructure metrics.
- Health endpoints: `/`, `/health`, `/metrics`; production adds `/live`, `/ready`, `/metrics/infra`.
- Chat endpoints are authenticated but not role-gated; identity is taken from the JWT, never from a request user ID.

### Persistence and Jobs

- PostgreSQL 16 via asyncpg; SQLite fallback only for a configured Docker `@db:` host that cannot resolve.
- Redis: refresh-token rotation state, chat memory, dashboard/HTTP caches.
- Celery worker and beat: alerts, notification delivery, health/expiry maintenance.
- Alembic chain: `0001_initial` → `0002_production_indexes` → `0003_deactivate_asha_role` → `0004_add_carecircle_tables` → `0005_role_specific_nutrition`.
- `app/main.py` lifespan and `scripts/seed.py` both call `create_all` and the SQLite compatibility shim. Applied migrations remain the schema authority for PostgreSQL.

### Runtime and Deployment

- Dev Compose: API `8000`, PostgreSQL `5432`, Redis `6379`, worker. `docker-compose.override.yml` is auto-loaded and sets API/worker/beat to `ENVIRONMENT=production` with production start scripts.
- Production Compose: adds nginx, Prometheus, Grafana, and production startup/healthchecks. Its service list includes a Celery worker but **no Celery beat**; the development override is where beat is defined.
- The backend does not serve the frontend bundle in the development Compose stack; run Vite separately unless using a deployment setup that serves the built assets.
- Data and model artifacts under `data/` are ignored by Git and `.dockerignore`. A production image must explicitly provide the corpus/index if corpus-backed retrieval is required; packaging is **unverified**.

## 4. Authentication, Roles, and Authorization

See [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md) for the full matrix.

- Roles: `mother`, `caregiver`, `doctor`, `admin`; no ASHA role.
- Self-registration is unavailable for doctor and admin. The UI registration selector offers mother and caregiver.
- Login is portal-aware; a portal mismatch is rejected. Admin login uses `/auth/admin/login` and `/internal/admin/login`.
- Doctors must have `is_verified=true`; otherwise login/API access is rejected as pending verification.
- Access tokens expire after 30 minutes by default; refresh tokens after 7 days, with Redis-backed rotation and DB revocation records.
- `forgot-password` performs an account-existence-safe no-op; it does not send email. Reset-token issuance is absent, so the reset-password endpoint is not an end-to-end usable flow without an externally created token.
- `change-password` verifies the current password, validates policy, hashes the new password, and revokes all refresh tokens.
- Doctor portal object authorization uses approved `CareCircleAccess`, not `DoctorPatient`. Admins bypass the consent check in doctor routes. Escalation notification targeting separately uses active `DoctorPatient` links.
- CareCircle consent is explicit per scope. New requests start with all sharing flags false. Revocation is immediate for new checks. Shared chat history and nutrition require their own scopes.
- Administrators can update role, active state, and verification state through `PATCH /admin/users/{id}`. There is no separate doctor-license field or verification document workflow.
- Demo seeding creates verified/active accounts for mother, doctor, caregiver, and admin. The seed password comes from `NURTUREHER_DEMO_PASSWORD` with a default; demo credentials must not be reused outside local demonstrations.

## 5. RAG and Chat: Current Behavior

The current served path is **corpus-first with evidence gating, then v1 fallback**. RAG v2 is no longer merely isolated experimental code: `app/services/corpus_evidence.py` imports v2 retrieval, store, evidence, and embedding components and is used by `ChatbotService`.

Detailed operations: [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md).

### Served flow

1. **Urgent safety gate** (`app/services/safety.py`) runs first. Self-harm and urgent-medical phrases can bypass retrieval/generation.
2. **Language resolution** uses detected script/keywords, request language, and profile preference.
3. **Conversational intent routing** handles greetings, thanks, capabilities, and everyday emotional check-ins. Medical-looking messages do not enter this path.
4. **English-first query translation** is attempted for non-English input; failure falls back to the original query.
5. **Deterministic triage** (`chat-triage-v1`) classifies ROUTINE, NEEDS_ATTENTION, or URGENT. The LLM never decides emergency status.
6. **Corpus retrieval** embeds the query with MiniLM, ranks chunks, applies the calibrated threshold, and runs the evidence gate. A non-sufficient verdict falls back to the v1 knowledge base.
7. **v1 fallback** uses the eight internal English knowledge entries with its own threshold. Those entries are marked unverified and pending clinical review; retrieval success is not clinical validation.
8. **Gemini generation** uses the configured model or fallback chain; without a key it uses a local templated fallback.
9. **Citation validation** strips unknown or malformed citations. Citation source resolution maps only retrieved IDs to real internal or corpus metadata.
10. **Disclaimer enforcement, persistence, and history**: replies are persisted and returned with source metadata where resolvable.

### Verified corpus snapshot

- Corpus ID: `medical-corpus-v1`
- Manifest created: `2026-10-16T03:31:12.276009+00:00`
- 6 source documents, 5 eligible, 1 quarantined (`mohfw-pnc-note`, provenance review pending)
- 1,167 chunks; 98 bibliography chunks dropped
- Embedding: `sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions
- Default threshold: `0.254`
- Source PDFs: 6 under `data/medical_corpus/`

These values were read from the current `data/rag_index/manifest.json`, `chunks.json`, and `vectors.npy`; `docs/RAG_RUNBOOK.md` previously reported a stale ~1,265 chunk count.

### Safety and review status

- Safety templates: `safety-templates-v1`, status `pending-clinical-review`.
- Triage rules: `chat-triage-v1`, status `pending-clinical-review`.
- Conversational responses: status `pending-native-review`.
- Crisis templates are currently English-only by design. Phrase lists cover six languages but need native-speaker and clinician review.
- Safety matching has no negation handling; a denial can still match. This is documented as a conservative failure mode, not a solved problem.
- Retrieval thresholds and citation behavior are evaluated for relevance, not medical correctness.

### Known RAG limitations

- Multilingual retrieval quality is uneven; MPNet benchmark results are historical and provisional.
- PCOS corpus coverage is thin; maternal sleep has a documented evidence gap.
- v1 fallback content is English-only and pending clinical review.
- No conversation threads; one stream per user.
- Voice backend is a placeholder: `app/services/voice_service.py` returns synthetic transcript/text payloads. Browser Web Speech provides the usable microphone/speech experience.
- Full live-Gemini evaluation requires explicit approval, credentials, and network; it is not part of routine checks.

## 6. Feature Status

| Area | Status | Current limits |
| --- | --- | --- |
| Auth/JWT/RBAC | Implemented | Incomplete password reset flow; doctor verification is an admin flag only |
| Mother wellness | Implemented | General educational content; not diagnostic |
| PCOS screening | Implemented | Risk-support model; clinical meaning unverified |
| PPD/EPDS screening | Implemented | Sentiment is English-lexicon limited |
| Cycle tracking | Implemented | Date-based prediction, not medical guidance |
| AI coach | Implemented | RAG evidence limits, pending clinical/native review, mock backend voice |
| CareCircle | Implemented | Consent-scoped; PDF/notification behavior should be verified per deployment |
| Doctor portal | Implemented | Consent-based via CareCircle; admin bypass; no license registry |
| Nutrition | Implemented | Educational plans; not individualized clinical nutrition |
| Caregiver content | Implemented | Content requires clinical review for medical claims |
| Admin | Implemented | Account updates and audit viewing; no full compliance console |
| HerReach | Implemented | Google Places key optional; otherwise deep-link/degraded mode |
| Reports | Implemented | Export formatting and clinical claims require review |
| PWA | Implemented | App shell offline only; no offline data |
| Notifications | Implemented | Delivery depends on provider/Celery configuration |
| District analytics | Frontend route present | Backend behavior not fully audited; verify before describing as complete |

## 7. Security, Privacy, and Data Handling

- Never print or commit environment values, tokens, API keys, passwords, private patient details, or raw chat content.
- `.env` is intentionally ignored; `.env.example` contains placeholders and Docker hostnames.
- The root README secret-like fragment has been redacted in this pass; rotation/revocation remains an external action if the fragment was real.
- Demo passwords exist in seed defaults and demo-page fallback code as a local convenience. They are a known deployment risk; production must not rely on them.
- `scripts/seed.py` prints the demo password to the terminal. Do not capture that output in docs, tickets, or chat.
- CareCircle consent defaults are false on new requests. Doctor and caregiver access paths must retain object-level checks, not just role checks.
- Safety and triage are not clinically validated. Do not infer safety from passing tests.
- Audit logs exist but are not a compliance certification.

## 8. Verification History

### Current audit (verified-in-repo)

- Branch, HEAD, commit count, stash, and dirty-worktree composition verified with Git commands.
- Mounted router list, auth behavior, doctor verification, CareCircle consent, doctor authorization, chat flow, corpus artifacts, frontend routes, demo page, seed behavior, and Compose override behavior read from source/artifacts.
- Corpus counts and embedding metadata read directly from `data/rag_index/`.
- Documentation checks are limited to `git diff --check`, safe link checks, and safe secret-pattern scans. Expensive tests/model/index operations are intentionally excluded from the documentation pass.

### Previously reported (not freshly verified)

- Frontend: 8 test files / 51 tests passed; `npx tsc -b`, `npm run lint`, and `npm run build` passed.
- Targeted backend chat/safety/privacy tests: 70 passed; observed subset coverage 53.5% against the repository-wide 80% gate.
- Docker API was healthy; Alembic current/head was `0005`; Ruff and `git diff --check` passed on touched files.
- Older reports claim backend totals of 31, 151, or 300 passing tests. These conflict and are **historical/previously-reported**, not current evidence.
- No fresh full backend suite, live Gemini evaluation, full browser matrix, PWA offline matrix, or production deployment was run for this documentation revision.

## 9. Historical Context (Preserved)

- **ASHA removal:** the role and routes were removed; migration `0003` deactivates legacy rows rather than deleting them. Some old reports still describe ASHA as current.
- **RAG phases:** safety templates, speculative evidence gating, v1 fallback, RAG v2 components, corpus ingestion, benchmark, and threshold calibration were developed over multiple sessions. Older docs called v2 “isolated/unwired”; the current integration through `corpus_evidence.py` supersedes that claim while preserving the historical audit findings.
- **Integration merge:** the current branch reconciled Gayathri's features, CareCircle/doctor/nutrition work, migrations `0004`/`0005`, and RAG changes. Work remains uncommitted.
- **Branding/PWA:** official emblem/wordmark assets, favicons, manifest, service worker, offline banner, sidebar branding, and a closed-mobile brand gap were part of recent frontend work.
- **Reports retained for history:** `nurtureher_project_audit_report.md` (2026-09-02), `docs/production_readiness_report.md` (2026-07-09), RAG benchmark/threshold reports, and `corpus_eval_report.md`. Treat them as dated evidence, not current status.

## 10. Known Issues and Pending Decisions

1. **Secret rotation:** if the redacted README fragment was real, revoke/rotate the Gemini key. Not performed here.
2. **Demo credentials:** seed default and frontend fallback passwords remain a risk. Replace via environment overrides and production provisioning.
3. **Password reset:** no email delivery or reset-token issuance; do not advertise as working.
4. **Doctor verification:** no license/document workflow or expiry; only `is_verified`.
5. **Routing inconsistency:** duplicate `/chat-history` route definitions; verify in browser before documenting intended behavior.
6. **Mobile branding:** closed mobile top bar lacks the brand mark.
7. **RAG review:** clinical/native review of safety, triage, corpus, thresholds, and multilingual behavior remains pending.
8. **RAG evidence:** PCOS coverage thin; maternal-sleep evidence gap; old chat location text is not scrubbed from persisted records.
9. **Corpus packaging:** `data/` is ignored by Git and Docker build context; production must supply the index explicitly.
10. **OpenAPI:** `docs/openapi.json` is a generated snapshot and may lag the mounted routers; regenerate only when appropriate.
11. **Production beat gap:** `docker-compose.prod.yml` does not define Celery beat, even though beat is present in the development override. Verify scheduled-job coverage before relying on beat-dependent tasks.
12. **Full verification:** full test suite, PWA/browser matrix, live Gemini behavior, and deployment end-to-end remain unverified.
13. **Clinical claims:** do not present screening scores, citations, or retrieval confidence as diagnoses or validated medical fact.

## 11. Recovery Checklist for a Fresh Session

1. Run `git status --short`, `git rev-parse --abbrev-ref HEAD`, `git log -1 --oneline`, and `git stash list`.
2. Confirm the branch, HEAD, dirty files, and `stash@{0}` match this record; if not, stop and report before changing anything.
3. Read [`docs/README.md`](./README.md), this file, and [`SESSION_START_HERE.md`](./SESSION_START_HERE.md).
4. Re-read the source files relevant to the requested task; never trust a count or status from memory alone.
5. Preserve all source and untracked work. Do not reset, clean, stash, commit, push, merge, rebase, or switch branches without explicit authorization.
6. Do not read `.env`, print secrets, or copy patient/chat content into docs.
7. Run focused tests with `--no-cov` unless the full gate is specifically requested.
8. Update this handover and the documentation index after approved changes, with exact files and evidence labels.

## 12. Operating Rules

1. Source code and current artifacts are the authority.
2. Plan before implementation; build only on explicit approval.
3. Keep changes scoped to the request; do not rewrite unrelated work.
4. Preserve historical reports and mark conflicts instead of deleting evidence.
5. Distinguish verified, previously-reported, historical, planned, and unverified claims.
6. Never claim clinical validation, diagnostic accuracy, regulatory compliance, or production readiness.
7. Keep secrets, passwords, tokens, patient data, and raw chat content out of documentation and terminal output.
8. Record unresolved problems and failures honestly.
9. Keep `PROJECT_MEMORY.md` as the canonical handover; avoid duplicate competing handover files.
10. Leave changes uncommitted unless the user explicitly asks for a commit.
