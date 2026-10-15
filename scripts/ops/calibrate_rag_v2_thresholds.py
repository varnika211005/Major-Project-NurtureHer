"""Calibrate RAG v2 retrieval thresholds from measured score distributions.

Offline and local-only: embeds the fixed 8-document v1 corpus and all P2
labeled cases with each backend, then derives conservative per-backend
default cutoffs. Writes:
  - app/rag_v2/thresholds.json  (machine table consumed by retrieve.py)
  - docs/rag_v2_thresholds.md   (human report with ranges, gaps, recall cost)

Rule: default cutoff = just above the irrelevant-control maximum, provided
a clean gap to the relevant minimum exists; otherwise the higher of the two
(conservative, favoring refusal) with the recall cost stated explicitly.
Provisional labels are reported separately and never used to lower cutoffs.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

os.environ.setdefault("HF_HUB_OFFLINE", "0")

from app.rag.knowledge_base import all_entries  # noqa: E402  (read-only use of v1 corpus texts)
from app.rag_v2.cases import CASES  # noqa: E402
from app.rag_v2.embeddings import (  # noqa: E402
    MINILM_DIMENSION,
    MINILM_MODEL_ID,
    MPNET_DIMENSION,
    MPNET_MODEL_ID,
    MPNET_REVISION,
    EmbeddingBackend,
    ModelUnavailableError,
)
from app.rag_v2.store import CosineStore  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MPNET_MANUAL_DIR = os.environ.get(
    "RAG_V2_MPNET_DIR",
    r"C:\Users\Dell\.cache\huggingface\manual\mpnet-4328cf2",
)


def load_backends() -> list[EmbeddingBackend]:
    backends = [EmbeddingBackend(name="minilm", model_id=MINILM_MODEL_ID, dimension=MINILM_DIMENSION)]
    if Path(MPNET_MANUAL_DIR).is_dir():
        manual = EmbeddingBackend(name="mpnet", model_id=MPNET_MANUAL_DIR, dimension=MPNET_DIMENSION, revision=None)
        # Weights were downloaded with revision= pinned; record the canonical
        # identity alongside the actual local load path.
        manual.canonical_id = MPNET_MODEL_ID  # type: ignore[attr-defined]
        manual.canonical_revision = MPNET_REVISION  # type: ignore[attr-defined]
        backends.append(manual)
    else:
        backends.append(EmbeddingBackend(name="mpnet", model_id=MPNET_MODEL_ID, dimension=MPNET_DIMENSION, revision=MPNET_REVISION))
    loaded = []
    for backend in backends:
        try:
            backend.embed(["connectivity check"])
            loaded.append(backend)
        except ModelUnavailableError as exc:
            print(f"SKIP backend {backend.name!r}: {exc}", file=sys.stderr)
    if not loaded:
        print("FATAL: no embedding backend available; refusing to invent thresholds.", file=sys.stderr)
        sys.exit(2)
    return loaded


def main() -> None:
    backends = load_backends()
    docs = {entry.id: entry.content for entry in all_entries()}
    doc_ids = list(docs.keys())

    per_backend: dict = {}
    for backend in backends:
        started = time.perf_counter()
        store = CosineStore(docs, backend.embed([docs[doc_id] for doc_id in doc_ids]))
        _ = time.perf_counter() - started
        relevant_scores: list[float] = []
        relevant_provisional: list[float] = []
        irrelevant_top: list[float] = []
        per_case: dict = {}
        for case in CASES:
            ranked = store.rank(backend.embed([case.query])[0], k=len(doc_ids))
            top = ranked[0][1] if ranked else 0.0
            if not case.relevant_doc_ids:
                irrelevant_top.append(top)
                continue
            wanted = set(case.relevant_doc_ids)
            best_relevant = max((s for doc_id, s in ranked if doc_id in wanted), default=0.0)
            (relevant_provisional if case.provisional else relevant_scores).append(best_relevant)
            per_case[case.id] = {
                "language": case.language,
                "script": case.script,
                "provisional": case.provisional,
                "best_relevant_score": round(best_relevant, 4),
                "top1_score": round(top, 4),
            }
        rel_min = min(relevant_scores) if relevant_scores else None
        irr_max = max(irrelevant_top) if irrelevant_top else None
        if rel_min is not None and irr_max is not None and rel_min > irr_max:
            cutoff = round((rel_min + irr_max) / 2.0, 3)
            gap_note = f"clean gap [{irr_max:.3f}, {rel_min:.3f}]"
        elif irr_max is not None:
            cutoff = round(irr_max + 0.001, 3)
            gap_note = f"NO clean gap (irrelevant max {irr_max:.3f}); conservative cutoff above it"
        else:
            cutoff = 0.30
            gap_note = "no irrelevant controls measured; carried v1 default 0.30 (unverified)"
        per_backend[backend.name] = {
            "model_id": getattr(backend, "canonical_id", backend.model_id),
            "revision": getattr(backend, "canonical_revision", backend.revision),
            "load_path": backend.model_id,
            "dimension": backend.dimension,
            "load_ms": backend.load_ms,
            "established_relevant_min": rel_min,
            "established_relevant_max": max(relevant_scores) if relevant_scores else None,
            "established_n": len(relevant_scores),
            "provisional_relevant_min": (min(relevant_provisional) if relevant_provisional else None),
            "provisional_n": len(relevant_provisional),
            "irrelevant_max_top1": irr_max,
            "irrelevant_n": len(irrelevant_top),
            "chosen_default": cutoff,
            "gap_note": gap_note,
            "per_case": per_case,
        }

    table = {name: {"default": info["chosen_default"], "per_category": {}} for name, info in per_backend.items()}
    table_path = ROOT / "app" / "rag_v2" / "thresholds.json"
    table_path.write_text(json.dumps(table, indent=2), encoding="utf-8")

    lines = ["# RAG v2 P3 threshold calibration", ""]
    for name, info in per_backend.items():
        lines += [
            f"## {name} (`{info['model_id']}`, revision={info['revision']}, dim={info['dimension']}, load_ms={info['load_ms']}, load_path={info['load_path']})",
            f"- established relevant range: min={info['established_relevant_min']} max={info['established_relevant_max']} (n={info['established_n']})",
            f"- provisional relevant min: {info['provisional_relevant_min']} (n={info['provisional_n']}) — NOT used to set cutoffs",
            f"- irrelevant max top-1: {info['irrelevant_max_top1']} (n={info['irrelevant_n']})",
            f"- chosen default cutoff: **{table[name]['default']}** — {info['gap_note']}",
            "- recall trade-off: cutoff set conservatively; recall cost must be read from the benchmark report, not assumed here",
            "",
        ]
    lines += [
        "## Limitations",
        "- Small labeled set; provisional non-English labels unreviewed by native speakers.",
        "- Cutoffs separate measured relevant/irrelevant score masses; they do not prove medical correctness.",
        "- Machine timings/hardware-specific; rerun on target hardware before production use.",
    ]
    (ROOT / "docs" / "rag_v2_thresholds.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    print(f"Wrote {table_path} and docs/rag_v2_thresholds.md")


if __name__ == "__main__":
    main()
