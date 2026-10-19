"""Corpus-backed evidence retrieval for the chatbot (medical-corpus index).

Loads the reproducible artifacts written by
scripts/ops/ingest_medical_corpus.py (data/rag_index/) and exposes
threshold-gated, evidence-gated retrieval over authoritative passages:

  embed query (MiniLM) -> brute-force cosine rank -> calibrated cutoff
  (existing minilm threshold) -> EvidenceGate floor -> SUFFICIENT verdict
  with cited chunk ids, or a non-sufficient outcome the caller must
  handle by falling back to the existing v1 KB path.

Fail-closed: a missing/unreadable index raises CorpusUnavailableError;
callers treat that as no evidence and use the v1 fallback. Thresholds are
never recalibrated here.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.rag_v2.embeddings import minilm_backend
from app.rag_v2.evidence import EvidenceDecision, EvidenceGate, EvidenceVerdict
from app.rag_v2.retrieve import RetrievalDiagnostics, ThresholdTable
from app.rag_v2.store import CosineStore

logger = logging.getLogger(__name__)

DEFAULT_INDEX_DIR = Path("data") / "rag_index"
BACKEND_NAME = "minilm"


class CorpusUnavailableError(RuntimeError):
    """Raised when the corpus index cannot be loaded; callers fall back to v1."""


@dataclass(frozen=True)
class CorpusEvidence:
    """Outcome of one gated corpus retrieval."""

    verdict: EvidenceVerdict
    cited_ids: tuple[str, ...]
    context_lines: tuple[str, ...]
    diagnostics: RetrievalDiagnostics
    top_score: float
    reason: str
    # Above-threshold ranked (chunk_id, score) pairs, always populated even
    # when the gate refuses: refusal discards evidence by design, and callers
    # fall back to v1. Exposed for evaluation/diagnosis, never served directly.
    candidates: tuple[tuple[str, float], ...] = ()


class CorpusIndex:
    """Threshold- and evidence-gated retrieval over the indexed corpus."""

    def __init__(self, index_dir: Path | str = DEFAULT_INDEX_DIR) -> None:
        index_dir = Path(index_dir)
        try:
            chunks = json.loads((index_dir / "chunks.json").read_text(encoding="utf-8"))
            manifest = json.loads((index_dir / "manifest.json").read_text(encoding="utf-8"))
            vectors = np.load(index_dir / "vectors.npy")
        except (OSError, ValueError) as exc:
            raise CorpusUnavailableError(f"corpus index unreadable at {index_dir}: {exc}") from exc
        if not chunks or vectors.shape[0] != len(chunks):
            raise CorpusUnavailableError(f"corpus index inconsistent at {index_dir}")
        self._chunks = chunks
        self._by_id = {chunk["id"]: chunk for chunk in chunks}
        self._store = CosineStore(
            {chunk["id"]: chunk["text"] for chunk in chunks},
            np.asarray(vectors, dtype="float32"),
        )
        self._backend = minilm_backend()
        default = float(
            manifest["embedding"].get("threshold_default")
            if isinstance(manifest.get("embedding"), dict)
            else ThresholdTable({"minilm": {"default": 0.254, "per_category": {}}}).get("minilm")
        )
        self._thresholds = ThresholdTable({BACKEND_NAME: {"default": default, "per_category": {}}})
        self._gate = EvidenceGate(min_score=default)
        self.threshold = default
        logger.info("Corpus index loaded: %d chunks from %s", len(chunks), index_dir)

    @property
    def chunk_count(self) -> int:
        return len(self._chunks)

    def retrieve(self, query: str, top_k: int = 4) -> CorpusEvidence:
        threshold = self._thresholds.get(BACKEND_NAME)
        query_vector = self._backend.embed([query])[0]
        ranked = self._store.rank(query_vector, top_k)
        filtered = [(doc_id, score) for doc_id, score in ranked if score >= threshold]
        diagnostics = RetrievalDiagnostics(
            top_score=max((score for _, score in filtered), default=0.0),
            scores=tuple(score for _, score in filtered),
            doc_count=len(filtered),
            backend=BACKEND_NAME,
            threshold=threshold,
        )
        topics_of = {doc_id: self._topic_of(doc_id) for doc_id, _ in filtered}
        decision: EvidenceDecision = self._gate.decide(
            [(doc_id, score) for doc_id, score in filtered], topics_of
        )
        cited = tuple(doc_id for doc_id, _ in filtered) if decision.verdict == EvidenceVerdict.SUFFICIENT else ()
        lines = tuple(self._format(chunk_id) for chunk_id in cited)
        return CorpusEvidence(
            verdict=decision.verdict,
            cited_ids=cited,
            context_lines=lines,
            diagnostics=diagnostics,
            top_score=diagnostics.top_score,
            reason=decision.reason,
            candidates=tuple(filtered),
        )

    def _topic_of(self, chunk_id: str) -> str:
        """Finest available topic unit for ambiguity checks.

        Prefers the chunk's document-structure section (when the index
        carries one), then the document's primary topic, then the document
        id. Sections from different documents can still differ -- competing
        sections within the margin stay AMBIGUOUS by design.
        """
        chunk = self._by_id[chunk_id]
        section = (chunk.get("section") or "").strip()
        if section:
            return f"section:{section}"
        topics = chunk.get("topics") or []
        if topics:
            return str(topics[0])
        return chunk["doc_id"]

    def _format(self, chunk_id: str) -> str:
        chunk = self._by_id[chunk_id]
        pages = ",".join(str(page) for page in chunk.get("pages", []))
        section = (chunk.get("section") or "").strip()
        where = f"p.{pages}" + (f", {section}" if section else "")
        return f"- [{chunk_id}] {chunk['title']} ({where}): {chunk['text']}"

    def passage(self, chunk_id: str) -> dict | None:
        """Return the indexed passage for citation-resolution checks."""
        return self._by_id.get(chunk_id)


_index: CorpusIndex | None = None


def get_corpus_index(index_dir: Path | str | None = None) -> CorpusIndex:
    """Process-wide lazy singleton (resettable in tests via reset_corpus_index)."""
    global _index
    if _index is None:
        _index = CorpusIndex(index_dir or DEFAULT_INDEX_DIR)
    return _index


def reset_corpus_index() -> None:
    global _index
    _index = None
