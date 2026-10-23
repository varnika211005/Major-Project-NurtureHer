# Implementation Status

> Status as of 2026-10-21 for branch `integration/gayathri-features` at HEAD `a1d9832`, with substantial uncommitted work. This is an engineering status document, not clinical validation or production approval.

## Status Legend

- **Implemented** — current source contains a working flow; verification level is stated separately.
- **Implemented with gaps** — core flow exists but a material limitation or missing step remains.
- **Partial** — some layers exist, but end-to-end behavior is incomplete or not verified.
- **Unverified** — claimed or plausible but not confirmed by current source or execution.
- **Not implemented** — no current implementation found.

## Feature Status

| Feature | Status | Evidence and limits |
| --- | --- | --- |
| Mother registration/login | Implemented | Mother/caregiver self-registration; portal-aware login; JWT access/refresh |
| Caregiver registration/login | Implemented | Same auth path, caregiver portal |
| Doctor login | Implemented with gaps | Admin-only creation; `is_verified` boolean; no license/document workflow |
| Admin login | Implemented | Separate admin portal and internal UI route |
| Password reset | Implemented with gaps | Forgot endpoint does not send email or issue a reset token; reset is not usable end-to-end |
| Password change | Implemented | Current-password check, policy enforcement, refresh-token revocation |
| Role-based UI | Implemented | Mother/caregiver/doctor/admin route wrappers |
| Wellness tracking | Implemented | Mood, symptoms, journal, dashboard, insights, profile, reports |
| Cycle tracking | Implemented | Mother-only CRUD and date-based prediction |
| PCOS screening | Implemented | Mother/admin; risk-support output; model/clinical meaning not validated here |
| PPD screening | Implemented | Mother/admin; EPDS-style assessment plus lexicon sentiment; English sentiment limits |
| AI coach | Implemented with gaps | Corpus-first RAG, v1 fallback, safety gate, citations; pending clinical/native review |
| Chat history | Implemented | Per-user stream; duplicate frontend route declaration needs browser verification |
| Voice chat | Partial | Browser Web Speech is usable; backend STT/TTS service is a placeholder |
| CareCircle QR consent | Implemented | 30-day QR, explicit approval, six scopes, immediate revocation |
| Doctor patient portal | Implemented | Consent-based through approved CareCircle access; admin bypass |
| Doctor notes | Implemented | Note creation and timeline retrieval; consent behavior documented |
| Doctor chat-history access | Implemented | Requires `share_chat_history` unless admin |
| Doctor escalation queue | Implemented with gap | Open chat-triage cases for approved patients; does not additionally filter `share_risk_category` |
| Nutrition | Implemented | Mother preferences/plans/hydration/myths; caregiver and doctor access paths; educational, not clinical nutrition |
| Caregiver content hub | Implemented | Videos/tips/articles; admin-managed content; clinical review pending |
| Admin user management | Implemented | List/filter, role/active/verified updates |
| Admin analytics/audit view | Implemented | Aggregate counts and paginated audit logs; not a compliance console |
| HerReach facility search | Implemented with gaps | Live Google Places when key configured; otherwise deep-link/degraded mode; no key in `.env.example` |
| Notifications | Implemented | User-scoped endpoints; provider/Celery delivery depends on configuration |
| Reports | Implemented | Authenticated report listing/export; formatting and clinical wording need review |
| PWA | Implemented | Installable app shell; API and clinical data are not cached offline |
| District analytics | Partial/unverified | Frontend route exists; backend data contract was not fully verified |
| SMS | Implemented with gaps | Twilio/Fast2SMS integrations; production config fails closed when credentials are missing |
| Celery jobs | Implemented with gap | Worker/beat tasks exist; the development override defines beat, but production Compose currently defines only a worker |
| Docker development | Implemented with caveat | Default Compose auto-loads production override; use explicit base compose file for development |
| Kubernetes/production | Implemented, unverified | Manifests and production entrypoint exist; no deployment in this audit |
| Clinical validation | Not established | No clinical study, clinician sign-off, or regulatory review evidenced |
| Regulatory compliance | Not established | Audit logs/consent controls do not by themselves establish HIPAA/DPDP compliance |

## Current Architecture Snapshot

- FastAPI API with routers for auth, wellness, cycle, PCOS, PPD, chat, caregiver, CareCircle, doctor, HerReach, nutrition, admin, and notifications.
- SQLAlchemy 2.0 async with PostgreSQL in Docker/production; conditional SQLite fallback for local smoke use.
- JWT auth; 30-minute access tokens; 7-day rotating refresh tokens backed by Redis and database records.
- React/Vite/Tailwind SPA with role-aware routes and a PWA app-shell cache.
- Celery worker/beat for background jobs.
- RAG: MiniLM corpus retrieval through `corpus_evidence.py` and `app/rag_v2`, with v1 knowledge-base fallback.
- Alembic head: `0005_role_specific_nutrition`.

## Verified Evidence From This Audit

These were checked directly against current files or artifacts:

- Branch `integration/gayathri-features`, HEAD `a1d9832`, 8 reachable commits, safety stash present, substantial uncommitted work.
- Mounted backend routers and chat endpoints.
- Auth registration restrictions, portal checks, doctor verification, token rotation/revocation behavior, and password policy.
- CareCircle request defaults, approval defaults, revocation, doctor authorization, and consent-scope checks.
- Chat pipeline ordering and corpus-first/v1-fallback branches.
- Corpus manifest: 6 documents, 5 eligible, 1 quarantined, 1,167 chunks, 98 bibliography chunks dropped, 384 dimensions, threshold `0.254`.
- Frontend route definitions, `/demo` role cards, admin login route, and duplicate `/chat-history` entries.
- Compose override behavior, production start script, Alembic chain, and seed role creation.
- README contained a secret-like truncated credential fragment; it has been removed in this pass.

## Previously Reported Verification

These results were reported by earlier sessions and were not freshly rerun during the documentation pass:

- Frontend: 8 test files / 51 tests passed; TypeScript, ESLint, and production build passed.
- Targeted backend RAG/safety/privacy tests: 70 passed; observed subset coverage 53.5% against the repository-wide 80% gate.
- Docker API health check passed; Alembic current/head was `0005`; Ruff passed on touched files.
- Historical reports contain conflicting backend totals (31, 151, 300). These are not reconciled current evidence.

## Verification Still Missing

- A fresh full backend test run after the final RAG/citation changes. A previous attempt timed out.
- Full frontend suite after the latest working-tree changes.
- Live Gemini generation and citation behavior with real credentials.
- Complete browser route matrix, accessibility audit, and PWA update/offline matrix.
- End-to-end deployment on Kubernetes or production Compose.
- Native-language review for Hindi, Kannada, Tamil, Telugu, and Malayalam.
- Clinical review of triage rules, safety templates, corpus content, fallback content, and thresholds.
- Production corpus packaging from a clean checkout or Docker build.
- Concurrency/load testing, penetration testing, and disaster-recovery rehearsal.

## Known Issues and Risks

### Security and privacy

1. A secret-like truncated Gemini key fragment was removed from the README. If it was real, revoke/rotate the provider key. No rotation was performed here.
2. The seed script has a default demo password and prints it. Demo-page fallback password values also exist in frontend source. These are local-demo risks; production must provision credentials explicitly.
3. Password reset is incomplete: no email delivery, no reset-token issuance.
4. CareCircle approval schema defaults three scopes to true when omitted; clients must send explicit selections.
5. The doctor escalation queue does not add a `share_risk_category` filter.
6. Access tokens are not immediately revoked on logout/password change; they expire naturally.
7. There is no MFA, SSO, doctor-license workflow, or admin approval workflow.
8. Do not claim regulatory compliance from consent/audit features alone.

### Product/UI

1. Duplicate `/chat-history` route definitions may make intended behavior unclear.
2. Closed mobile top bar lacks the brand mark.
3. `/demo` provides three role shortcuts, not one-click login on the login page and not an admin shortcut.
4. District analytics frontend/backend completeness is unverified.
5. Some older documentation still describes removed features or stale screenshots/counts; use the documentation index to distinguish current from historical.

### RAG/clinical

1. Safety templates and triage rules are pending clinical review.
2. Crisis matching is English-only and lacks negation handling.
3. v1 fallback entries and corpus content are pending clinical review.
4. PCOS corpus coverage is thin; maternal sleep has an evidence gap.
5. Multilingual retrieval quality is uneven and native review is pending.
6. Corpus/index artifacts are ignored by Git and Docker build context.
7. Retrieval scores and citations do not establish medical correctness.
8. Voice backend is mocked; only browser speech is usable.

### Verification/operations

1. Full tests, live AI, browser/PWA, and deployment remain unverified.
2. `docs/openapi.json` may lag mounted routes.
3. Existing reports conflict on test counts and migration head; do not quote them as current.
4. Local setup requires care because `.env.example` uses Docker hostnames and Alembic has no SQLite fallback.
5. Production Compose has no Celery beat service; scheduled jobs that depend on beat are not covered by that stack.

## Development History Summary

- Initial full-stack platform with auth, wellness, screening, chat, caregiver, and admin surfaces.
- Branding/PWA and mobile-navigation refinements.
- CareCircle consent plus doctor portal and nutrition features.
- ASHA role removal and legacy-row deactivation.
- RAG phases: safety gate, v1 fallback, experimental v2, ingestion, evidence gating, citation validation, benchmark/threshold reports.
- Gayathri feature integration and migration reconciliation (`0004`, `0005`).
- Current uncommitted working tree includes application, test, docs, and RAG changes.

## Review Checklist Before Any Release Claim

- [ ] Fresh full backend suite and frontend suite pass.
- [ ] Security review covers demo credentials, reset flow, CareCircle scope enforcement, and escalation visibility.
- [ ] Clinical reviewer signs off on triage, safety copy, corpus, and fallback content.
- [ ] Native-language review is complete for every supported language.
- [ ] Corpus/index is packaged and verified in the deployment artifact.
- [ ] Live Gemini behavior and failure modes are exercised.
- [ ] Browser/PWA/accessibility matrix passes.
- [ ] Deployment, backup, restore, and rollback are rehearsed.
- [ ] Legal/privacy review confirms applicable regulatory claims.
- [ ] Documentation no longer contains stale readiness or test claims.

## Related Documents

- [`README.md`](./README.md)
- [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md)
- [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md)
- [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md)
- [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md)
- [`production_readiness_report.md`](./production_readiness_report.md) — historical
