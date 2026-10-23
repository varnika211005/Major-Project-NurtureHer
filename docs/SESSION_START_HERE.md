# NurtureHer — Session Start Here

> **Read order:** this file → [`README.md`](./README.md) → [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) → the focused reference for the task. Repository code and artifacts are the authority; documentation is orientation.
>
> **Current documentation revision:** 2026-10-21. This pack was written against the uncommitted working tree described below.

## 1. Verify Before Trusting Any History

Run these read-only commands first:

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git log -1 --format="%h %ad %s" --date=short
git stash list
```

Expected at the start of this documentation audit:

- Branch: `integration/gayathri-features`
- HEAD: `a1d9832`
- Substantial uncommitted work; at audit start, 104 porcelain entries (76 modified, 28 untracked), nothing staged.
- Safety stash: `stash@{0}` — `safety-backup-before-gayathri-integration-2026-10-18`

The documentation pass intentionally adds files, so the live count will differ. Do not reset, clean, stash, apply the stash, commit, push, merge, rebase, or switch branches. If branch/HEAD/stash do not match, stop and report.

## 2. Current Ground Truth

- **Roles:** `mother`, `caregiver`, `doctor`, `admin`. There is no ASHA role.
- **Login:** public login is portal-aware; doctors require `is_verified=true`; admin uses `/internal/admin/login`; `/demo` has mother/caregiver/doctor shortcuts only.
- **Authorization:** doctor portal object access uses approved `CareCircleAccess`; escalation targets use active `DoctorPatient` links. Admin bypasses doctor-object consent checks.
- **Password reset:** email delivery and reset-token issuance are absent; do not describe password reset as end-to-end functional.
- **RAG:** the served chat path is corpus-first through `app/services/corpus_evidence.py` (which uses `app/rag_v2`) with v1 knowledge-base fallback. The old “v2 is isolated/unwired” statement is obsolete.
- **Corpus:** 6 documents, 5 eligible, 1 quarantined, 1,167 chunks, 98 bibliography chunks dropped, MiniLM 384-d, threshold `0.254`.
- **Safety:** triage rules and templates are pending clinical review; crisis matching is English-only and lacks negation handling. Tests and retrieval scores are not clinical validation.
- **Migrations:** Alembic head is `0005_role_specific_nutrition`.
- **PWA:** installable app shell with offline UI; no offline clinical/chat data.
- **Secret note:** an older README contained a secret-like truncated Gemini key fragment. It has been redacted; if it was real, the provider key should be revoked/rotated. Never reproduce or print it.

## 3. Working Constraints

- Scope: `C:\NurtureHer` only. Never inspect or modify `C:\NurtureHer-backup-20261012`.
- Preserve all uncommitted work. Do not modify application code or runtime configuration unless explicitly requested.
- Audit/read first; propose a plan; implement only after explicit approval.
- Documentation-only changes stay uncommitted unless a commit is explicitly requested.
- Never print environment values, secrets, tokens, passwords, private patient data, or raw chat content.
- Do not run expensive model downloads, corpus ingestion, or the full test suite merely to update docs.
- Never disable or skip failing tests to force a green result.
- No claims of clinical validation, diagnostic accuracy, regulatory compliance, or production readiness.

## 4. Current Task State

The approved documentation recovery pack is complete in the working tree, pending final checks:

- Root `README.md` rewritten and the secret-like fragment removed.
- `docs/README.md` created as the documentation index.
- `docs/PROJECT_MEMORY.md` rewritten as the canonical handover.
- `AUTH_AND_RBAC.md`, `DEVELOPMENT_RUNBOOK.md`, and `IMPLEMENTATION_STATUS.md` created.
- RAG runbook/architecture corrected; API, environment, deployment, architecture, ER, installation, and examples updated.
- Historical banners added to the beginner setup and production-readiness documents.
- No application code changed. No commit made.

## 5. Next Step

Run the safe documentation checks:

```powershell
git diff --check
git status --short
```

Also run safe relative-link and secret-pattern checks that report paths/line numbers only. Report exact changed files, checks performed, the secret-rotation action, and any unverified claims. Do not start implementation work from the resolved RAG plan without a new explicit request.

## 6. Key Commands

Backend:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
alembic upgrade head
python -m pytest -q
python -m ruff check .
```

Focused backend tests without the repository-wide coverage gate:

```powershell
python -m pytest <test-paths> --no-cov -p no:cacheprovider -q
```

Frontend:

```powershell
Set-Location frontend
npm run dev
npm run test
npx tsc -b
npm run lint
npm run build
```

RAG offline tools (only with explicit need):

```powershell
python scripts/ops/run_rag_v2_benchmark.py
python scripts/ops/calibrate_rag_v2_thresholds.py
```

## 7. Documentation Links

- Index: [`README.md`](./README.md)
- Canonical handover: [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md)
- Auth/RBAC: [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md)
- RAG operations: [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md)
- RAG architecture/audit: [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md)
- Development: [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md)
- Status/gaps: [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md)
- Deployment: [`deployment_guide.md`](./deployment_guide.md), [`production_infrastructure.md`](./production_infrastructure.md)
- Backup/migrations: [`backup_restore.md`](./backup_restore.md), [`migration_strategy.md`](./migration_strategy.md)
- Historical evidence: [`corpus_eval_report.md`](./corpus_eval_report.md), [`rag_v2_benchmark_report.md`](./rag_v2_benchmark_report.md), [`rag_v2_thresholds.md`](./rag_v2_thresholds.md)
