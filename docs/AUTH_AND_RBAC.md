# Authentication and RBAC

> Verified against current source on 2026-10-21. This document describes implemented behavior, including known limitations. It is not a security certification.

## 1. Role Model

The only application roles are:

| Role | Purpose | Self-registration |
| --- | --- | --- |
| `mother` | Health tracking, screening, AI coach, CareCircle owner | Yes |
| `caregiver` | Educational content and consent-scoped support access | Yes |
| `doctor` | Consent-authorized clinical review and notes | No |
| `admin` | Account administration, audit logs, aggregate analytics, doctor-view bypass | No |

There is no ASHA Worker role. Legacy ASHA rows are treated as inactive/missing by auth lookup and are deactivated by migration `0003_deactivate_asha_role`; they are not silently mapped to another role.

Role values are stored in the database and checked again on every authenticated request. A changed role, deactivated account, or unverified doctor state therefore affects subsequent API requests even if an access token was already issued.

## 2. Registration

`POST /api/v1/auth/register`

- Accepts `email`, `name`, `password`, optional `phone`, optional `role` (default `mother`), and `preferred_language` (default `en`).
- Rejects self-registration for `doctor` and `admin` with `403`.
- Permits `mother` and `caregiver` registration.
- Rejects duplicate email with `409`.
- Normalizes email to lowercase before storage.
- Does **not** implement email verification. `is_verified` is an administrative doctor-verification flag, not proof that an email address was verified.
- Password policy: 8–128 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character. Violations return `422`.
- The bcrypt implementation truncates input at 72 bytes. Treat passwords longer than that as providing no additional entropy in this implementation.

## 3. Login and Portals

`POST /api/v1/auth/login`

- Request body: `email`, `password`, optional `portal`.
- If `portal` is supplied, the account role must match it; a mismatch returns `403`.
- Unknown email and wrong password both return `401` for the public login path.
- Inactive accounts return `403`.
- Unverified doctors return `403` with a pending-verification message.
- Successful login returns an access token and a refresh token.

`POST /api/v1/auth/admin/login`

- Always validates against the `admin` portal; a non-admin account cannot use it.
- Used by `/internal/admin/login`.

Frontend portal behavior:

- `/login` lets the user choose mother, doctor, or caregiver.
- `/internal/admin/login` is the administrator entry point.
- `/demo` has shortcuts for mother, caregiver, and doctor only. It is not a one-click login on the public login page and does not provide an admin shortcut.
- Demo records are seeded accounts; credentials come from local environment/seed configuration and must not be copied into documentation.

## 4. Token Lifecycle

| Token | Default lifetime | Contents/behavior |
| --- | --- | --- |
| Access | 30 minutes | Bearer JWT; subject is the user ID; role/active/verified state reloaded from DB per request |
| Refresh | 7 days | Bearer JWT with `jti`; tracked in Redis and the refresh-token table |

Implemented behavior:

- All protected endpoints expect `Authorization: Bearer <access-token>`.
- Missing/invalid credentials, missing users, and inactive users return `401`.
- An unverified doctor returns `403` even if a token exists.
- `POST /auth/refresh` rotates the refresh token. The old refresh token is deleted from Redis and marked revoked in the database; a reused token fails.
- `POST /auth/logout` revokes the supplied refresh token and its Redis record. It does **not** revoke other sessions and does not invalidate an already-issued access token.
- `POST /auth/change-password` verifies the current password, applies the policy, replaces the hash, and revokes all refresh tokens for the user. Existing access tokens can remain usable until their 30-minute expiry.
- There is no token-version/denylist check for access tokens, no MFA, and no SSO.

## 5. Password Reset: Incomplete

`POST /auth/forgot-password` returns a generic account-enumeration-safe message. It does **not** send email and does **not** generate a reset token.

`POST /auth/reset-password` expects a JWT of type `reset`. No current route issues such a token. Consequently, password reset is not an end-to-end usable user flow without an external token-generation process. Do not advertise it as functional.

`POST /auth/change-password` is implemented for authenticated users and is the supported password-change path.

## 6. Authorization Model

Two layers must both hold:

1. **Role gate** — `require_roles(...)` on the route or router.
2. **Object/consent check** — ownership or approved CareCircle access for the specific record.

A role gate alone is not sufficient for mother data, doctor-patient views, caregiver summaries, or chat history.

### Route-group summary

| Route group | Role/access behavior |
| --- | --- |
| `/auth/register`, `/login`, `/admin/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` | Public |
| `/auth/me`, `/auth/change-password` | Any authenticated active user |
| `/wellness` | Mixed: mother-only for most writes; shared reads use authenticated access and service-level ownership; dashboard/analytics/insights/profile/reports are authenticated |
| `/cycle` | Mother only |
| `/pcos`, `/ppd` | Mother or admin |
| `/chat` | Any authenticated user; identity comes only from the JWT, never a client-supplied user ID |
| `/carecircle` | Mixed: mother owns QR/request/approval/revocation actions; any authenticated requester can request access, list their own approved connections, or check their own request status |
| `/doctor` | Doctor or admin; doctor access to a patient requires approved, unrevoked CareCircle access |
| `/caregiver` | Caregiver content for caregivers; admin-only content mutations |
| `/nutrition` | Mother for own profile/preferences/plans; caregiver access through approved connection; doctor access through approved patient access; admin where implemented |
| `/admin` | Admin only |
| `/herreach` | Authenticated; administrative recommendation mutations require admin |
| `/notifications` | Authenticated, scoped to the current user's notifications |

FastAPI returns `401` for missing/invalid authentication and `403` for insufficient role, portal mismatch, unverified doctor, or missing consent. Some object lookups intentionally return `404` instead of `403` to avoid confirming that another user's record exists.

## 7. Doctor Verification and Authorization

- `is_verified` is checked at login, refresh, and every authenticated request.
- There is no doctor-license field, uploaded credential, expiry date, or review workflow in the current model. Verification is a boolean set by an administrator.
- Doctor portal authorization does **not** use `DoctorPatient`.
  - `GET /doctor/patients` lists mothers with approved, unrevoked `CareCircleAccess` for the requesting doctor.
  - Timeline, notes, and chat-history endpoints call `_get_authorized_patient`, which requires approved, unrevoked CareCircle access.
  - Admins bypass the CareCircle requirement and can list/read all active mothers.
- `DoctorPatient` active links are used for escalation notification targeting, not as the doctor-portal access primitive. Do not conflate the two.

### What each consent scope controls in doctor routes

| Scope | Current effect |
| --- | --- |
| `share_emergency` | Blood group and emergency contact in patient list/timeline |
| `share_risk_category` | Latest/historical PCOS and PPD risk categories |
| `share_wellness_summary` | Recent moods and latest symptom record |
| `share_doctor_notes` | If false, a doctor sees only their own notes; if true, notes from all doctors for that patient |
| `share_chat_history` | Required for the patient chat-history endpoint; otherwise `403` |
| `share_nutrition` | Relevant to nutrition access; verify the specific endpoint before relying on it |

Known consent gap: `GET /doctor/escalations` filters by approved CareCircle access but does not additionally require `share_risk_category`. That means an escalation case can appear for a doctor with approved access even when risk-category sharing is off. Treat this as an unresolved product/privacy decision, not a documented consent guarantee.

## 8. CareCircle Consent Flow

### Request creation

1. A mother creates/retrieves a 30-day QR token at `/carecircle/qr/generate` or `/carecircle/qr`.
2. Regenerating a token expires the mother's previous active QR tokens.
3. An authenticated requester submits the token to `/carecircle/request-access`.
4. Self-requests are rejected.
5. A new request initializes **all** sharing flags to `false`.
6. Re-requesting after rejection/revocation reuses the record but resets every sharing flag to `false` and status to `pending`.
7. Existing pending/approved requests are returned without creating a duplicate.

QR payloads contain a token, not medical data. The token is bearer-like: anyone who obtains and uses it before expiry can request access, but access still requires the mother's approval.

### Approval and scopes

`POST /carecircle/requests/{id}/respond` is mother-only and accepts `approve`/`reject` plus six flags:

- `share_emergency`
- `share_risk_category`
- `share_wellness_summary`
- `share_doctor_notes`
- `share_nutrition`
- `share_chat_history`

Important API default: the response schema defaults `share_emergency`, `share_risk_category`, and `share_wellness_summary` to `true`, while doctor notes, nutrition, and chat history default to `false`. If a client approves without sending explicit choices, the first three become enabled. This is an implicit opt-in surface; clients should always send the mother's explicit selections.

Rejection also writes the submitted flags to the record, but the `rejected` status prevents access. Revocation sets `status=revoked` and `revoked_at`; flags are not cleared, but access checks require approved and unrevoked status.

### Access checks

- Approved connections require `status == "approved"` and `revoked_at is null`.
- The mother can revoke immediately; new authorization checks fail after commit.
- A requester can only read the status of their own access request.
- `GET /carecircle/connections` returns approved connections for the requester and omits inactive mothers.
- CareCircle is available to any authenticated requester role; doctors commonly use it as their patient-authorization path.

## 9. Administrative Access

Admin routes require `admin`:

- `GET /admin/dashboard` — user and operational counts.
- `GET /admin/analytics` — aggregate role, alert, and risk summaries.
- `GET /admin/users` — paginated user list with role/search filters.
- `PATCH /admin/users/{id}` — update name, phone, language, role, `is_active`, and `is_verified`.
- `GET /admin/audit-logs` — paginated audit-log view.

There is no separate deactivate endpoint; deactivation is `is_active=false` through the user update. Deactivated users fail auth on subsequent requests. There is no dedicated admin MFA, admin approval workflow, or immutable audit guarantee documented here.

## 10. Frontend and API-Client Notes

- `frontend/src/App.tsx` wraps role-sensitive routes in protected route wrappers.
- The admin area is reachable by admin accounts through internal routes; a doctor account is not an administrator merely because they can access doctor pages.
- Shared pages (for example, profile or notifications) can be available to all authenticated roles while backend object checks still apply.
- The frontend API client attaches the bearer access token. Treat browser token storage as sensitive and avoid logging request headers or token values.
- A duplicate `/chat-history` route declaration exists: `ChatHistoryPage` first, then a redirect to `/coach?history=1`. Verify the effective behavior in a browser before relying on either page.

## 11. Verification Map

| Claim | Source |
| --- | --- |
| Role enum | `app/core/security.py` |
| Registration restrictions/password policy | `app/services/auth.py`, `app/utils/passwords.py` |
| Login, portal, verification | `app/services/auth.py` |
| Per-request active/verified/role check | `app/core/dependencies.py` |
| Refresh rotation/revocation | `app/services/token_service.py` |
| CareCircle request/approval/revocation | `app/api/routes/carecircle.py` |
| Doctor consent enforcement | `app/api/routes/doctor.py` |
| Admin operations | `app/api/routes/admin.py` |
| Frontend portal/demo routing | `frontend/src/App.tsx`, `frontend/src/pages/AuthPages.tsx`, `frontend/src/pages/DemoPage.tsx` |

## 12. Known Gaps and Do Not Claim

- Do not claim working email password reset.
- Do not claim doctor license verification or credential review.
- Do not claim MFA, SSO, or enterprise identity integration.
- Do not claim access tokens are immediately revoked on logout/password change; refresh tokens are revoked, access tokens expire naturally.
- Do not claim the escalation queue honors `share_risk_category`; it does not currently apply that extra filter.
- Do not claim CareCircle approval is impossible without explicit scope selection; API defaults enable three scopes if omitted.
- Do not claim HIPAA/DPDP compliance, encryption guarantees beyond the implementation, or penetration-test status without separate evidence.
