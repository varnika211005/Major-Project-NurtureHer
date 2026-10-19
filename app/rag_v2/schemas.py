"""RAG v2 corpus schemas (P1).

Every medical document must carry full provenance before it can be
considered for production indexing. Documents with
``review_status="pending"`` or incomplete provenance are quarantined by
``app.rag_v2.ingest`` and can never enter a production-eligible set.
"""

from __future__ import annotations

from dataclasses import dataclass, field


ALLOWED_LANGUAGES = ("en", "hi", "kn", "ta", "te", "ml")

ALLOWED_REVIEW_STATUS = ("pending", "approved")


@dataclass(frozen=True)
class SourceProvenance:
    """Verifiable origin of a corpus document.

    `url_or_path` is either a public URL or a documented local source
    location. Empty/placeholder values mean the document is unsourced.
    """

    publisher: str
    url_or_path: str
    publication_date: str = ""
    review_date: str = ""
    review_status: str = "pending"


@dataclass(frozen=True)
class MedicalDocument:
    id: str
    title: str
    body: str
    language: str
    topics: tuple[str, ...] = ()
    source: SourceProvenance | None = None


@dataclass(frozen=True)
class Chunk:
    doc_id: str
    index: int
    of: int
    text: str
    language: str
    topics: tuple[str, ...] = ()
    pages: tuple[int, ...] = ()


@dataclass(frozen=True)
class ValidationIssue:
    doc_id: str
    reason: str


@dataclass(frozen=True)
class ValidationResult:
    eligible: tuple[MedicalDocument, ...] = ()
    quarantined: tuple[ValidationIssue, ...] = ()


@dataclass(frozen=True)
class CorpusManifest:
    """Byte-deterministic provenance manifest for a validated corpus."""

    version: str
    eligible_ids: tuple[str, ...] = ()
    quarantined: tuple[ValidationIssue, ...] = field(default_factory=tuple)

    def to_text(self) -> str:
        lines = [f"version={self.version}", f"eligible={len(self.eligible_ids)}"]
        lines.extend(f"eligible-id={doc_id}" for doc_id in self.eligible_ids)
        for issue in self.quarantined:
            lines.append(f"quarantined={issue.doc_id}:{issue.reason}")
        return "\n".join(lines) + "\n"
