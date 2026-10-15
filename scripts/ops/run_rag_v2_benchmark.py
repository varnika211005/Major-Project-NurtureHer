"""P2 embedding benchmark: MiniLM vs multilingual MPNet (local inference only).

Measures per-language Recall@k/MRR, latency (median/p95), peak memory, and
load time on the same labeled cases and the same 8-document corpus. Makes
NO external inference calls; model weights must already exist locally
(MiniLM: HF cache; MPNet: approved manual download). If MPNet weights are
missing, the script exits non-zero with a clear message — it never
substitutes another model or hash embeddings.

Usage: venv/Scripts/python.exe scripts/ops/run_rag_v2_benchmark.py [--reps N]
Output: docs/rag_v2_benchmark_report.md + docs/rag_v2_benchmark_report.json
"""

import argparse
import json
import os
import statistics
import sys
import time
import tracemalloc
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.rag.knowledge_base import all_entries
from app.rag_v2.benchmark import BenchmarkCase, BenchmarkReport
from app.rag_v2.cases import CASES
from app.rag_v2.embeddings import (
    MINILM_DIMENSION,
    MINILM_MODEL_ID,
    MPNET_DIMENSION,
    MPNET_MODEL_ID,
    MPNET_REVISION,
    EmbeddingBackend,
    ModelUnavailableError,
)
from app.rag_v2.store import CosineStore

MPNET_MANUAL_DIR = r"C:\Users\Dell\.cache\huggingface\manual\mpnet-4328cf2"
MINILM_REFS_MAIN = Path(r"C:\Users\Dell\.cache\huggingface\hub\models--sentence-transformers--all-MiniLM-L6-v2\refs\main")


def read_minilm_revision() -> str:
    try:
        return MINILM_REFS_MAIN.read_text(encoding="utf-8").strip()
    except OSError:
        return "unknown (refs/main unreadable)"


def build_backends(mpnet_path: str | None) -> list[EmbeddingBackend]:
    backends = [EmbeddingBackend(name="minilm", model_id=MINILM_MODEL_ID, dimension=MINILM_DIMENSION)]
    if mpnet_path and Path(mpnet_path).is_dir():
        backends.append(EmbeddingBackend(name="mpnet", model_id=mpnet_path, dimension=MPNET_DIMENSION, revision=None))
    else:
        backends.append(EmbeddingBackend(name="mpnet", model_id=MPNET_MODEL_ID, dimension=MPNET_DIMENSION, revision=MPNET_REVISION))
    loaded = []
    for backend in backends:
        try:
            # Accessing _model forces load now so failures surface with context.
            _ = backend._model
            loaded.append(backend)
        except ModelUnavailableError as exc:
            print(f"FATAL: backend '{backend.name}' unavailable: {exc}", file=sys.stderr)
            print("Refusing to substitute another model or hash embeddings.", file=sys.stderr)
            sys.exit(2)
    return loaded


def to_benchmark_cases() -> list[BenchmarkCase]:
    return [BenchmarkCase(id=c.id, query=c.query, relevant_doc_ids=c.relevant_doc_ids, language=f"{c.language}:{c.script}") for c in CASES]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reps", type=int, default=3)
    parser.add_argument("--mpnet-path", default=MPNET_MANUAL_DIR)
    args = parser.parse_args()

    os.environ["HF_HUB_OFFLINE"] = "0"
    backends = build_backends(args.mpnet_path)
    # From here on, forbid any further hub downloads.
    os.environ["HF_HUB_OFFLINE"] = "1"

    docs = {entry.id: entry.content for entry in all_entries()}
    cases = to_benchmark_cases()
    print(f"cases={len(cases)} docs={len(docs)} reps={args.reps}")

    per_backend: dict = {}
    all_scores: dict[str, dict[str, float]] = {}
    top1_by_case: dict[str, dict[str, float]] = {}
    for backend in backends:
        print(f"[{backend.name}] load_ms={backend.load_ms} dim={backend.dimension}")
        tracemalloc.start()
        doc_vectors = backend.embed(list(docs.values()))
        store = CosineStore(dict(zip(docs.keys(), docs.values())), doc_vectors)
        latencies: list[float] = []
        scores: dict[str, float] = {}
        top1_by_case[backend.name] = {}
        for case in cases:
            rep_times = []
            ranked = []
            for _ in range(args.reps):
                started = time.perf_counter()
                qvec = backend.embed([case.query])[0]
                ranked = store.rank(qvec, k=len(docs))
                rep_times.append((time.perf_counter() - started) * 1000.0)
            latencies.append(statistics.median(rep_times))
            for doc_id, score in ranked:
                scores[f"{case.id}::{doc_id}"] = score
            if ranked:
                top1_by_case[backend.name][case.id] = ranked[0][1]
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        lat_sorted = sorted(latencies)
        p95 = lat_sorted[min(len(lat_sorted) - 1, int(len(lat_sorted) * 0.95))]
        per_backend[backend.name] = {
            "load_ms": backend.load_ms,
            "latency_median_ms": round(statistics.median(latencies), 1),
            "latency_p95_ms": round(p95, 1),
            "peak_kb": int(peak // 1024),
        }
        all_scores[backend.name] = scores

    from app.rag_v2.benchmark import BackendResult

    report = BenchmarkReport(
        cases=tuple(BenchmarkCase(id=c.id, query=c.query, relevant_doc_ids=c.relevant_doc_ids, language=c.language) for c in cases),
        results=tuple(
            BackendResult(
                backend=b.name,
                scores=all_scores[b.name],
                latency_ms=per_backend[b.name]["latency_median_ms"],
                peak_kb=per_backend[b.name]["peak_kb"],
            )
            for b in backends
        ),
    )

    lines = [
        "# RAG v2 P2 embedding benchmark report",
        "",
        f"minilm: id={MINILM_MODEL_ID} revision={read_minilm_revision()} dim={MINILM_DIMENSION}",
        f"mpnet: id={MPNET_MODEL_ID} revision={MPNET_REVISION} dim={MPNET_DIMENSION}",
        f"load_path_mpnet={args.mpnet_path}",
        f"cases={len(cases)} (provisional non-English labels pending native-speaker review)",
        "",
    ]
    summary: dict = {"models": {}, "by_language": {}, "irrelevant": {}}
    for backend in backends:
        r1 = report.recall_at_k(backend.name, 1)
        r4 = report.recall_at_k(backend.name, 4)
        mrr = report.mrr(backend.name)
        by_lang = report.recall_by_language(backend.name, 1)
        # Provisional split.
        prov_ids = {c.id for c in CASES if c.provisional}
        est_ids = {c.id for c in CASES if not c.provisional and c.relevant_doc_ids}
        summary["models"][backend.name] = {
            **per_backend[backend.name],
            "recall_at_1": round(r1, 3),
            "recall_at_4": round(r4, 3),
            "mrr": round(mrr, 3),
        }
        summary["by_language"][backend.name] = {k: round(v, 3) for k, v in sorted(by_lang.items())}
        lines += [
            f"## {backend.name}",
            f"- recall@1={r1:.3f} recall@4={r4:.3f} mrr={mrr:.3f}",
            f"- latency median={per_backend[backend.name]['latency_median_ms']}ms "
            f"p95={per_backend[backend.name]['latency_p95_ms']}ms "
            f"peak={per_backend[backend.name]['peak_kb']}KB load={per_backend[backend.name]['load_ms']}ms",
            "- per-language recall@1: " + ", ".join(f"{k}={v:.3f}" for k, v in sorted(by_lang.items())),
            f"- established-only cases: {len(est_ids)}, provisional-only cases: {len(prov_ids)}",
            "",
        ]
    irr = [c for c in CASES if not c.relevant_doc_ids]
    for backend in backends:
        top_scores = [top1_by_case[backend.name].get(c.id, 0.0) for c in irr]
        summary["irrelevant"][backend.name] = {
            "n": len(irr),
            "max_top1_score": round(max(top_scores, default=0.0), 3),
        }
        lines.append(f"- {backend.name} irrelevant controls: n={len(irr)}, " f"max top-1 score={max(top_scores, default=0.0):.3f}")
    lines += [
        "",
        "## Limitations",
        "- Small sample (~40 queries, 8 documents); provisional non-English labels unreviewed.",
        "- Topical-relevance judgments only; not clinical validation.",
        "- CPU timings on this machine; not comparable across hardware.",
    ]
    out_md = Path("docs/rag_v2_benchmark_report.md")
    out_json = Path("docs/rag_v2_benchmark_report.json")
    out_md.write_text("\n".join(lines), encoding="utf-8")
    out_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("\n".join(lines))
    print(f"Wrote {out_md} and {out_json}")


if __name__ == "__main__":
    main()
