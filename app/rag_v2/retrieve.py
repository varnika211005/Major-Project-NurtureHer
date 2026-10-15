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


class ThresholdTable:
    """Calibrated per-backend similarity cutoffs.

    `table` maps backend name -> {"default": float, "per_category": {...}}.
    Produced by scripts/ops/calibrate_rag_v2_thresholds.py from measured
    score distributions; never hand-tuned here.
    """

    def __init__(self, table: dict) -> None:
        self._table = table

    def get(self, backend: str, category: str | None = None) -> float:
        try:
            entry = self._table[backend]
            default = entry["default"]
        except (KeyError, TypeError) as exc:
            raise MissingThresholdError(f"no calibrated threshold for backend {backend!r}") from exc
        if category is not None:
            per_category = entry.get("per_category") or {}
            if category in per_category:
                return float(per_category[category])
        return float(default)

    @classmethod
    def from_dict(cls, data: dict) -> "ThresholdTable":
        if not isinstance(data, dict) or not data:
            raise MissingThresholdError("threshold table is empty or malformed")
        return cls(data)


class Retriever:
    """Top-k cosine retrieval with calibrated threshold filtering.

    `doc_categories` maps document id -> topic category and enables
    optional category-scoped retrieval.
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
    ) -> RetrievalResult:
        threshold = self.thresholds.get(self.backend.name)
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
