"""RAG v2 retrieval (P3).

Ranks a fixed document corpus with a caller-supplied embedding backend and
applies caller-supplied similarity thresholds. Thresholds come from a
generated table (see `thresholds.py`); if the table is missing or has no
entry for the backend, retrieval refuses to run (fail-closed) rather than
inventing a cutoff. Score semantics are cosine similarities in [-1, 1],
identical to the v1 FAISS path.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RetrievalDiagnostics:
    """Safe-to-log retrieval telemetry: scores, counts, backend names only."""

    top_score: float
    scores: tuple[float, ...] = ()
    doc_count: int = 0
    backend: str = "unknown"
    threshold: float = 0.0


@dataclass(frozen=True)
class RetrievalResult:
    documents: tuple[tuple[str, float], ...] = ()
    diagnostics: RetrievalDiagnostics = field(default_factory=RetrievalDiagnostics)

    @property
    def cited_ids(self) -> tuple[str, ...]:
        return tuple(doc_id for doc_id, _ in self.documents)

    @property
    def has_evidence(self) -> bool:
        return bool(self.documents)


class MissingThresholdError(RuntimeError):
    """Raised when no calibrated threshold exists for a backend."""


def _checked_cutoff(value: object, *, backend: object, category: object | None) -> float:
    """Validate one calibrated cutoff; raise MissingThresholdError if invalid."""
    where = f"backend {backend!r}"
    if category is not None:
        where += f" category {category!r}"
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise MissingThresholdError(f"threshold for {where} must be a number, got {value!r}")
    cutoff = float(value)
    if not math.isfinite(cutoff):
        raise MissingThresholdError(f"threshold for {where} must be finite")
    if not -1.0 <= cutoff <= 1.0:
        raise MissingThresholdError(f"threshold for {where} must lie in [-1, 1] (cosine range)")
    return cutoff


class ThresholdTable:
    """Calibrated per-backend similarity cutoffs.

    `table` maps backend name -> {"default": float, "per_category": {...}}.
    Produced by scripts/ops/calibrate_rag_v2_thresholds.py from measured
    score distributions; never hand-tuned here.

    Entries are strictly validated at construction: cutoffs must be real
    (non-bool) numbers, finite, and inside the [-1, 1] cosine range that
    every supported backend produces (L2-normalized embeddings — see
    embeddings.py and store.py). Numeric strings are rejected, not
    coerced. Anything else raises MissingThresholdError: fail closed.
    """

    def __init__(self, table: dict) -> None:
        if not isinstance(table, dict) or not table:
            raise MissingThresholdError("threshold table is empty or malformed")
        validated: dict[str, dict[str, object]] = {}
        for backend, entry in table.items():
            if not isinstance(entry, dict) or "default" not in entry:
                raise MissingThresholdError(
                    f"threshold entry for backend {backend!r} must define 'default'"
                )
            default = _checked_cutoff(entry["default"], backend=backend, category=None)
            per_category = entry.get("per_category", {})
            if not isinstance(per_category, dict):
                raise MissingThresholdError(
                    f"per_category for backend {backend!r} must be a mapping"
                )
            validated[backend] = {
                "default": default,
                "per_category": {
                    category: _checked_cutoff(value, backend=backend, category=category)
                    for category, value in per_category.items()
                },
            }
        self._table = validated

    def get(self, backend: str, category: str | None = None) -> float:
        try:
            entry = self._table[backend]
        except (KeyError, TypeError) as exc:
            raise MissingThresholdError(f"no calibrated threshold for backend {backend!r}") from exc
        if category is not None:
            if not isinstance(category, str):
                raise MissingThresholdError(
                    f"threshold category must be a string, got {type(category).__name__}"
                )
            per_category = entry["per_category"]
            if category in per_category:
                return per_category[category]
        return entry["default"]

    @classmethod
    def from_dict(cls, data: dict) -> "ThresholdTable":
        if not isinstance(data, dict) or not data:
            raise MissingThresholdError("threshold table is empty or malformed")
        return cls(data)


class Retriever:
    """Top-k cosine retrieval with calibrated threshold filtering.

    `doc_categories` maps document id -> topic category and enables
    optional category-scoped retrieval. `category` (per-call) selects the
    matching per-category calibrated cutoff; None uses the backend default.
    """

    def __init__(self, backend, store, thresholds: ThresholdTable, doc_categories: dict[str, str] | None = None) -> None:
        self.backend = backend
        self.store = store
        self.thresholds = thresholds
        self.doc_categories = doc_categories or {}

    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        allowed_categories: set[str] | None = None,
        category: str | None = None,
    ) -> RetrievalResult:
        threshold = self.thresholds.get(self.backend.name, category)
        query_vector = self.backend.embed([query])[0]
        ranked = self.store.rank(query_vector, top_k)
        if allowed_categories is not None:
            ranked = [(doc_id, score) for doc_id, score in ranked if self.doc_categories.get(doc_id) in allowed_categories]
        filtered = [(doc_id, score) for doc_id, score in ranked if score >= threshold]
        diagnostics = RetrievalDiagnostics(
            top_score=max((score for _, score in filtered), default=0.0),
            scores=tuple(score for _, score in filtered),
            doc_count=len(filtered),
            backend=self.backend.name,
            threshold=threshold,
        )
        logger.info(
            "rag_v2 retrieval backend=%s threshold=%.3f n_docs=%d top_score=%.3f",
            self.backend.name,
            threshold,
            len(filtered),
            diagnostics.top_score,
        )
        return RetrievalResult(documents=tuple(filtered), diagnostics=diagnostics)
