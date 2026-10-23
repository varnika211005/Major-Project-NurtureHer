# NurtureHer Documentation

This directory is the documentation and recovery pack for NurtureHer. It is intended for developers, reviewers, and AI assistants who need to understand the current repository without relying on stale session memory.

> **Authority order:** repository code and data artifacts first, then this index and the canonical handover (`PROJECT_MEMORY.md`), then the focused runbooks, then historical reports. If a document conflicts with source code, source code wins.

## Start Here

1. [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) — canonical handover, current verified snapshot, feature history, known issues, and operating rules.
2. [`SESSION_START_HERE.md`](./SESSION_START_HERE.md) — fast re-entry checklist and safe commands.
3. [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md) — roles, login portals, doctor verification, consent, and route authorization.
4. [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md) — corpus artifacts, served chat flow, fallback behavior, triage, citations, and tests.
5. [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) — local setup, Docker caveats, migrations, seed behavior, and focused checks.
6. [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) — feature-by-feature status and unresolved verification gaps.

## Evidence Labels

Use these labels in new or updated documentation:

- **verified-in-repo** — read from current source, configuration, migrations, or artifacts during the current audit.
- **previously-reported** — recorded by an earlier session or report but not independently rerun for this revision.
- **historical** — retained as evidence of an earlier state; not a current claim.
- **planned** — proposed but not implemented or approved.
- **unverified** — plausible or reported, but not confirmed against current source or a current execution.

Never turn a risk score, retrieval score, citation match, or test count into a claim of clinical validity, medical accuracy, regulatory compliance, or production readiness.

## Current Documentation

| Document | Status | Notes |
| --- | --- | --- |
| [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) | canonical handover | Current snapshot plus preserved historical context |
| [`SESSION_START_HERE.md`](./SESSION_START_HERE.md) | current entry point | Branch/worktree checks and safe first commands |
| [`AUTH_AND_RBAC.md`](./AUTH_AND_RBAC.md) | current reference | Auth flows, roles, doctor verification, consent boundaries |
| [`RAG_RUNBOOK.md`](./RAG_RUNBOOK.md) | current operations guide | Corpus counts, ingestion, chat pipeline, escalation, failure modes |
| [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) | current setup guide | Local and Docker instructions, Windows notes, checks |
| [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) | current status matrix | Verified capabilities, limitations, and pending review |
| [`architecture.md`](./architecture.md) | current short reference | Runtime components and request flow |
| [`environment_variables.md`](./environment_variables.md) | current name-level reference | Includes frontend and optional integration variables |
| [`api_documentation.md`](./api_documentation.md) | current route index | Complements generated OpenAPI |
| [`api_examples.md`](./api_examples.md) | current examples | Placeholder-only credentials and corrected PCOS payload |
| [`er_diagram.md`](./er_diagram.md) | current partial ER diagram | Core and care-sharing tables; not every supporting table |
| [`PWA.md`](./PWA.md) | current implementation note | Offline shell only; API and clinical data remain online-only |
| [`deployment_guide.md`](./deployment_guide.md) | current, verify environment | Compose/Kubernetes deployment steps; production values are not recorded |
| [`installation_guide.md`](./installation_guide.md) | supplementary | Short install reference; use `DEVELOPMENT_RUNBOOK.md` for current flow |
| [`production_infrastructure.md`](./production_infrastructure.md) | current reference | Production entrypoint, security, monitoring, Compose behavior |
| [`backup_restore.md`](./backup_restore.md) | current operational note | Script-based backup/restore |
| [`migration_strategy.md`](./migration_strategy.md) | current operational note | Alembic workflow and rollback |
| [`openapi.json`](./openapi.json) | generated snapshot | May lag source; regenerate with `make openapi` when appropriate |
| [`postman/NurtureHer.postman_collection.json`](./postman/NurtureHer.postman_collection.json) | supporting artifact | Placeholder-only collection; verify requests against source |
| [`corpus_eval_report.md`](./corpus_eval_report.md) | dated evidence | Preserve raw evaluation findings; not clinical validation |
| [`rag_v2_benchmark_report.md`](./rag_v2_benchmark_report.md) | dated evidence | Historical benchmark numbers and machine-specific timings |
| [`rag_v2_benchmark_report.json`](./rag_v2_benchmark_report.json) | dated evidence | Machine-readable benchmark output |
| [`rag_v2_thresholds.md`](./rag_v2_thresholds.md) | dated evidence | Calibration evidence; thresholds are not clinical approval |
| [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md) | updated reference + historical audit | Current integration correction plus preserved audit findings |

## Historical and Superseded Documents

These files are retained for project history. Do not use them as the current setup or readiness source.

| Document | Why it is historical |
| --- | --- |
| [`../SETUP_AND_RUN.md`](../SETUP_AND_RUN.md) | Beginner walkthrough with an outdated one-click demo login flow; use the development runbook |
| [`production_readiness_report.md`](./production_readiness_report.md) | Dated 2026-07-09; test counts, migration head, and seed-password claims no longer match the working tree |
| [`../nurtureher_project_audit_report.md`](../nurtureher_project_audit_report.md) | Dated 2026-09-02; predates the removal of ASHA and the current RAG integration |
| [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) sections marked historical | Earlier integration notes retained only as context |

## Current Snapshot

- Branch: `integration/gayathri-features`
- HEAD: `a1d9832`
- Working tree: substantial uncommitted application, frontend, test, and documentation changes; `stash@{0}` holds a safety backup.
- RAG corpus: 6 source documents, 5 eligible, 1 quarantined, 1,167 indexed chunks, 98 bibliography chunks excluded, 384-dimensional MiniLM vectors, threshold `0.254`.
- RAG served path: corpus-first with evidence gating and v1 knowledge-base fallback.
- The repository uses Alembic through `0005_role_specific_nutrition`.
- No document in this pack claims live clinical validation or production approval.

## Safe Documentation Checks

```powershell
git diff --check
git status --short
git stash list
```

For documentation-link checking and secret-pattern scanning, report file paths and line numbers only. Never print matching values. Do not run model downloads, corpus ingestion, or the full test suite merely to update documentation.

## Maintenance Rules

1. Re-read the source before changing a status or count.
2. Distinguish current facts, previous-session claims, and historical evidence.
3. Preserve superseded reports; add a banner or index note instead of deleting them.
4. Do not copy secrets, passwords, tokens, private patient details, or raw chat messages into docs.
5. Keep `PROJECT_MEMORY.md` as the canonical handover; do not create a duplicate handover with competing authority.
6. Update this index when adding a new current document.
7. Record unresolved items honestly rather than filling gaps with assumptions.
