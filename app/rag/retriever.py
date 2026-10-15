from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.rag.vector_store import RetrievedDocument, get_vector_store

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RetrievalDiagnostics:
    """Safe-to-log retrieval telemetry.

    Contains scores, counts, and backend names only — never query text,
    user context, or health data.
    """

    top_score: float
    scores: tuple[float, ...] = ()
    doc_count: int = 0
    backend: str = "unknown"
    degraded: bool = False
    threshold: float = 0.0


@dataclass(frozen=True)
class RetrievalResult:
    documents: tuple[RetrievedDocument, ...] = ()
    diagnostics: RetrievalDiagnostics = field(default_factory=RetrievalDiagnostics)

    @property
    def cited_ids(self) -> tuple[str, ...]:
        return tuple(item.document.metadata.get("id", "") for item in self.documents)

    @property
    def has_evidence(self) -> bool:
        return bool(self.documents)


class HealthKnowledgeRetriever:
    def __init__(self, top_k: int = 4, min_score: float = 0.30) -> None:
        self.top_k = top_k
        self.min_score = min_score

    def retrieve(self, query: str, categories: set[str] | None = None) -> RetrievalResult:
        store = get_vector_store()
        degraded = store.embedding_service.is_degraded
        results, backend = store.search(query, self.top_k)
        if categories:
            results = [item for item in results if item.document.metadata.get("category") in categories]
        if degraded:
            # A degraded hash/NumPy path must never be presented as reliable
            # semantic medical retrieval: no documents count as evidence.
            diagnostics = RetrievalDiagnostics(
                top_score=max((item.score for item in results), default=0.0),
                scores=tuple(item.score for item in results),
                doc_count=0,
                backend=backend,
                degraded=True,
                threshold=self.min_score,
            )
            logger.info(
                "RAG retrieval degraded backend=%s n_raw=%d; treating as no evidence",
                backend,
                len(results),
            )
            return RetrievalResult(documents=(), diagnostics=diagnostics)
        filtered = [item for item in results if item.score >= self.min_score]
        diagnostics = RetrievalDiagnostics(
            top_score=max((item.score for item in filtered), default=0.0),
            scores=tuple(item.score for item in filtered),
            doc_count=len(filtered),
            backend=backend,
            degraded=False,
            threshold=self.min_score,
        )
        logger.info(
            "RAG retrieval backend=%s threshold=%.3f n_docs=%d top_score=%.3f",
            backend,
            self.min_score,
            len(filtered),
            diagnostics.top_score,
        )
        return RetrievalResult(documents=tuple(filtered), diagnostics=diagnostics)
