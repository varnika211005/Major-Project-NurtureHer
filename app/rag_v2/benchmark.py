"""RAG v2 benchmark harness scaffolding (P1).

Runs named backends over labeled query sets and records per-query scores,
latency, and peak memory into a JSON-serializable report. Backends are
plugged in via the BenchmarkBackend protocol — P1 ships only a
deterministic synthetic backend so the harness itself is fully testable
offline with no model downloads and no API calls.

Comparing real embedding models (MiniLM baseline vs multilingual MPNet)
requires explicit download approval and happens outside P1. No measured
multilingual improvement is claimed here.
"""

from __future__ import annotations

import time
import tracemalloc
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class BenchmarkCase:
    id: str
    query: str
    relevant_doc_ids: tuple[str, ...] = ()
    language: str = "en"


@dataclass(frozen=True)
class BackendResult:
    backend: str
    scores: dict[str, float]
    latency_ms: float
    peak_kb: int


@dataclass(frozen=True)
class BenchmarkReport:
    cases: tuple[BenchmarkCase, ...] = ()
    results: tuple[BackendResult, ...] = ()

    def recall_at_k(self, backend: str, k: int) -> float:
        """Fraction of cases with a relevant doc in top-k scored strictly
        above every irrelevant doc. Ties do not count, so an all-zero score
        table scores 0.0 rather than 1.0 by luck."""
        relevant = [r for r in self.results if r.backend == backend]
        if not relevant or not self.cases:
            return 0.0
        scores = relevant[0].scores
        hits = 0
        for case in self.cases:
            prefix = f"{case.id}::"
            ranked = sorted(
                ((key[len(prefix) :], value) for key, value in scores.items() if key.startswith(prefix)),
                key=lambda kv: kv[1],
                reverse=True,
            )
            wanted = set(case.relevant_doc_ids)
            best_irrelevant = max(
                (score for doc_id, score in ranked if doc_id not in wanted),
                default=float("-inf"),
            )
            if any(doc_id in wanted and score > best_irrelevant for doc_id, score in ranked[:k]):
                hits += 1
        return hits / len(self.cases)

    def _ranked(self, scores: dict[str, float], case_id: str) -> list[tuple[str, float]]:
        prefix = f"{case_id}::"
        return sorted(
            ((key[len(prefix) :], value) for key, value in scores.items() if key.startswith(prefix)),
            key=lambda kv: kv[1],
            reverse=True,
        )

    def mrr(self, backend: str) -> float:
        """Mean reciprocal rank of the first relevant doc (0.0 if absent)."""
        relevant = [r for r in self.results if r.backend == backend]
        if not relevant or not self.cases:
            return 0.0
        scores = relevant[0].scores
        total = 0.0
        for case in self.cases:
            wanted = set(case.relevant_doc_ids)
            if not wanted:
                continue
            for rank, (doc_id, _score) in enumerate(self._ranked(scores, case.id), start=1):
                if doc_id in wanted:
                    total += 1.0 / rank
                    break
        counted = sum(1 for case in self.cases if case.relevant_doc_ids)
        return total / counted if counted else 0.0

    def recall_by_language(self, backend: str, k: int) -> dict[str, float]:
        """Strict recall@k (same tie rule as recall_at_k) grouped by the
        case `language` attribute set by the caller."""
        relevant = [r for r in self.results if r.backend == backend]
        if not relevant or not self.cases:
            return {}
        scores = relevant[0].scores
        by_lang: dict[str, list[bool]] = {}
        for case in self.cases:
            if not case.relevant_doc_ids:
                continue
            wanted = set(case.relevant_doc_ids)
            ranked = self._ranked(scores, case.id)
            best_irrelevant = max(
                (score for doc_id, score in ranked if doc_id not in wanted),
                default=float("-inf"),
            )
            hit = any(doc_id in wanted and score > best_irrelevant for doc_id, score in ranked[:k])
            by_lang.setdefault(case.language, []).append(hit)
        return {lang: (sum(hits) / len(hits) if hits else 0.0) for lang, hits in by_lang.items()}

    def to_dict(self) -> dict:
        return {
            "cases": [c.id for c in self.cases],
            "backends": [
                {
                    "backend": r.backend,
                    "scores": dict(sorted(r.scores.items())),
                    "latency_ms": r.latency_ms,
                    "peak_kb": r.peak_kb,
                }
                for r in self.results
            ],
        }


class BenchmarkBackend(Protocol):
    name: str

    def score(self, query: str, doc_id: str) -> float: ...


@dataclass
class SyntheticBackend:
    """Deterministic offline backend for harness tests.

    Scores 1.0 for query/doc pairs listed in `relevance`, else 0.0.
    Contains no model, no network, no medical content.
    """

    name: str = "synthetic"
    relevance: dict[str, set[str]] = field(default_factory=dict)

    def score(self, query: str, doc_id: str) -> float:
        return 1.0 if doc_id in self.relevance.get(query, set()) else 0.0


def _doc_ids(cases: tuple[BenchmarkCase, ...]) -> list[str]:
    seen: list[str] = []
    for case in cases:
        for doc_id in case.relevant_doc_ids:
            if doc_id not in seen:
                seen.append(doc_id)
    return seen


def run_benchmark(cases: list[BenchmarkCase], backends: list[BenchmarkBackend]) -> BenchmarkReport:
    """Run every backend over every case; record scores, latency, peak memory."""
    case_tuple = tuple(cases)
    doc_ids = _doc_ids(case_tuple)
    results: list[BackendResult] = []
    for backend in backends:
        tracemalloc.start()
        started = time.perf_counter()
        scores: dict[str, float] = {}
        for case in case_tuple:
            for doc_id in doc_ids:
                scores[f"{case.id}::{doc_id}"] = backend.score(case.query, doc_id)
        latency_ms = (time.perf_counter() - started) * 1000.0
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        results.append(
            BackendResult(
                backend=backend.name,
                scores=scores,
                latency_ms=round(latency_ms, 3),
                peak_kb=int(peak // 1024),
            )
        )
    return BenchmarkReport(cases=case_tuple, results=tuple(results))
