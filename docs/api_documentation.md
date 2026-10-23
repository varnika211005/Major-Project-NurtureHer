# API Documentation

> Route-level reference for the current FastAPI application, verified 2026-10-21. The live OpenAPI schema is authoritative; `docs/openapi.json` may lag.

## Interactive Documentation

After starting the API:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

Production entrypoint also exposes:

- `GET /live`: process liveness
- `GET /ready`: PostgreSQL and Redis readiness
- `GET /metrics`: request metrics when enabled
- `GET /metrics/infra`: infrastructure metrics

`/health` is available from the base app; `/live`, `/ready`, and `/metrics/infra` are production-entrypoint additions.

## Base URL and Versioning

- Development base: `http://localhost:8000/api/v1`
- Routers are mounted under the configured `API_V1_PREFIX`.
- Pagination uses `limit` (1–100, default 50) and `offset` (default 0) where supported.
- Protected routes require `Authorization: Bearer <access-token>`.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Mother/caregiver self-registration only |
| POST | `/auth/login` | Portal-aware login |
| POST | `/auth/admin/login` | Admin-only login |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke supplied refresh token |
| POST | `/auth/forgot-password` | Generic response; does not send email or issue a reset token |
| POST | `/auth/reset-password` | Accepts a reset token; no current issuer exists |
| POST | `/auth/change-password` | Authenticated password change |
| GET | `/auth/me` | Current user |

See [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md) for portal rules, roles, tokens, and consent enforcement.

## Primary Modules

| Module | Prefix | Main purpose | Access summary |
| --- | --- | --- | --- |
| Authentication | `/auth` | Registration, login, tokens, password | Mixed/public |
| Wellness | `/wellness` | Mood, symptoms, journal, dashboard, insights, profile, reports | Mixed; mother writes, authenticated reads |
| Cycle | `/cycle` | Cycle CRUD and prediction | Mother |
| PCOS | `/pcos` | Risk-support prediction/history | Mother/admin |
| PPD | `/ppd` | EPDS-style assessment/history | Mother/admin |
| Chat | `/chat` | Message, voice, TTS, history | Any authenticated user |
| CareCircle | `/carecircle` | QR, access requests, approvals, revocation, connections | Mother + authenticated requesters |
| Doctor | `/doctor` | Authorized patients, timeline, notes, chat history, escalations | Doctor/admin |
| Caregiver | `/caregiver` | Videos, tips, articles, content management | Caregiver; admin mutations |
| Nutrition | `/nutrition` | Preferences, plans, hydration, myths, interactions | Mother/caregiver/doctor scoped access |
| HerReach | `/herreach` | Facility search, recommendations, helplines | Authenticated; admin mutations |
| Notifications | `/notifications` | User-scoped notifications | Authenticated |
| Admin | `/admin` | Dashboard, analytics, users, audit logs | Admin |

## Selected Endpoints

### Wellness

- `POST/GET/PATCH/DELETE /wellness/mood`
- `POST/GET/PATCH/DELETE /wellness/symptoms`
- `POST/GET/PATCH/DELETE /wellness/journal`
- `GET /wellness/dashboard`
- `GET /wellness/analytics`
- `GET /wellness/insights`
- `GET/PUT /wellness/profile`
- `GET /wellness/reports`

### Screening

- `POST /pcos/predict`, `GET /pcos/history`
- `POST /ppd/assessment`, `GET /ppd/history`

PCOS request fields: `age`, `bmi`, `cycle` (dataset encoding 2 or 4), `cycle_length`, `weight_gain`, `hair_growth`, `skin_darkening`, `hair_loss`, `pimples`.

### Chat

- `POST /chat/message` — JSON `{message, language}`; authenticated; identity from JWT.
- `POST /chat/voice` — multipart audio upload plus `language`; backend STT is currently a placeholder.
- `POST /chat/tts` — returns a base64 text payload; backend TTS is currently a placeholder.
- `GET /chat/history` — current user's messages, paginated.

The LLM does not decide emergency status. Safety detection precedes retrieval and generation. See [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md).

### CareCircle

- `POST /carecircle/qr/generate`, `GET /carecircle/qr` — mother QR token, 30-day validity.
- `POST /carecircle/request-access` — authenticated requester submits a QR token.
- `GET /carecircle/requests` — mother's incoming requests.
- `POST /carecircle/requests/{id}/respond` — mother approves/rejects and sets scopes.
- `POST /carecircle/requests/{id}/revoke` — immediate revocation.
- `GET /carecircle/requests/{id}/status` — requester's own request status.
- `GET /carecircle/connections` — requester's approved, unrevoked connections.

Access is not granted until the mother approves. See the consent defaults and gaps in [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md).

### Doctor

- `GET /doctor/patients` — consent-authorized patients; admin sees active mothers.
- `GET /doctor/patients/{id}/timeline`
- `POST /doctor/patients/{id}/notes`
- `GET /doctor/patients/{id}/chat-history` — requires `share_chat_history` unless admin.
- `GET /doctor/escalations` — open chat-triage cases for authorized patients; admin sees all.

Doctor object access uses approved `CareCircleAccess`, not `DoctorPatient`. Admins bypass the consent check. The escalation queue currently filters by approved access but not by `share_risk_category`.

### Nutrition

- Mother: `/nutrition/me`, preferences, plans, hydration, myths, interactions.
- Caregiver: `/nutrition/caregiver/connections/{access_id}`.
- Doctor: `/nutrition/doctor/patients/{patient_id}` and plan management.
- Access is consent/connection-scoped; verify the specific route's checks before assuming a scope is enforced.

### Admin

- `GET /admin/dashboard`
- `GET /admin/analytics`
- `GET /admin/users`
- `PATCH /admin/users/{id}` — role, active, verified, profile fields
- `GET /admin/audit-logs`

## Error Semantics

- `400` — invalid request state or bad current password in some flows.
- `401` — missing/invalid access token, inactive/missing user, invalid credentials.
- `403` — role/portal mismatch, unverified doctor, insufficient permission, missing consent.
- `404` — missing object, or intentionally hidden unauthorized object.
- `409` — duplicate email.
- `410` — expired CareCircle QR token.
- `422` — schema/password-policy validation failure.
- `429` — rate limit.

## Notes and Caveats

- The public registration endpoint rejects doctor/admin self-registration.
- Password reset is not end-to-end functional without an external reset-token issuer.
- `docs/openapi.json` is a generated snapshot and may lag the mounted routers.
- The frontend `/chat-history` route is declared twice; verify browser behavior.
- No endpoint here constitutes clinical validation or production readiness.
