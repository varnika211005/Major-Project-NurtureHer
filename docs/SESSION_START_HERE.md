# NurtureHer — Session Start Here (Entry Point)

> **Read order for a fresh session:** this file → `PROJECT_MEMORY.md` → `RAG_ARCHITECTURE.md` (only if touching RAG). `docs/` is the assistant's documentation zone — not a product manual. Repository code is the authority; memory files are orientation.

## Verify against the repo first (before trusting any history)
1. `git -C 'C:\NurtureHer' status --short` — expect branch `feature/rag-module`, 12 unstaged modifications, 16 untracked paths (19 total untracked including the 3 memory docs), nothing staged. If anything differs, stop and report; do not reset/rebase/stash.
2. Confirm remote `origin https://github.com/varnika211005/NurtureHer-Lilac.git` exists (informational only — never push without explicit approval).
3. Re-read the files you intend to change; confirm role enum (`mother/caregiver/doctor/admin` — no ASHA), RAG v1 (`app/rag/`) vs experimental v2 (`app/rag_v2/`) isolation.
4. Never print env values, tokens, keys, or personal data (names only).
5. Do not inspect or modify `C:\NurtureHer-backup-20261012`.

## Constraints and defaults
- Scope: `C:\NurtureHer` only. No `NurtureHerUpdated` entanglement (absent at inspected locations).
- Modes: audit in read-only; propose in Plan mode; build only on explicit user approval of the specific plan.
- Documentation-only unless told otherwise: update these docs after substantial approved changes (exact files + verification).
- Experimental RAG v2 stays isolated from served RAG v1 — no production switch without separate approval.
- NEVER disable/skip failing tests to force green; no clinical-validation, accuracy, or compliance claims.

## Current status snapshot (2026-10-14, uncommitted — verify live)
- Branch `feature/rag-module`; single commit `2ebd7ec Initial commit`; all session work (RAG Phase 1+2, `app/rag_v2/`, tests, reports, scripts) present but uncommitted.
- Production paths still run RAG v1 only (`app/rag/`). RAG remediation Phases A–F are **proposed, never approved for implementation — do not start them**.
- Open: multilingual RAG gaps, mock voice endpoints, single per-user chat stream, doctor-timeline over-collection (needs product decision), clinical review of templates/entries/thresholds.

## Next task on deck
None assigned. Default: verify/refine the RAG remediation plan on request only — implementation requires explicit approval with acceptance criteria.

## Key commands (PowerShell, read-only first)
- `git -C 'C:\NurtureHer' status --short`
- `git -C 'C:\NurtureHer' diff --stat`
- `git -C 'C:\NurtureHer' log --oneline -15`
- Backend: `uvicorn app.main:app` · `alembic upgrade head` · `pytest` (gate 80%) · `ruff`
- Frontend (`frontend/`): `npm run dev|build|preview|lint|test`
- RAG offline: `python scripts/ops/run_rag_v2_benchmark.py` · `python scripts/ops/calibrate_rag_v2_thresholds.py`

## Doc links
- Master record: [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md)
- RAG detail: [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md)
- RAG benchmark/threshold evidence: `docs/rag_v2_benchmark_report.md`, `docs/rag_v2_thresholds.md`
- Ops: `docs/backup_restore.md`, `docs/migration_strategy.md`, `docs/deployment_guide.md`, `docs/production_infrastructure.md`
