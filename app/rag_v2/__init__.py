"""RAG v2 package (P1 scaffolding + P2 embedding benchmark + P3 retrieval).

P3 adds calibrated retrieval, evidence gating, and citation validation.
Nothing here is wired into the application; `app/rag/` v1 remains the
sole served path. No production model switch.
"""

from app.rag_v2.citations import CitationReport, CitationResult, validate
from app.rag_v2.evidence import EvidenceDecision, EvidenceGate, EvidenceVerdict
from app.rag_v2.retrieve import (
    MissingThresholdError,
    RetrievalDiagnostics,
    RetrievalResult,
    Retriever,
    ThresholdTable,
)
from app.rag_v2.schemas import (
    Chunk,
    CorpusManifest,
    MedicalDocument,
    SourceProvenance,
    ValidationIssue,
    ValidationResult,
)

__all__ = [
    "Chunk",
    "CitationReport",
    "CitationResult",
    "CorpusManifest",
    "EvidenceDecision",
    "EvidenceGate",
    "EvidenceVerdict",
    "MedicalDocument",
    "MissingThresholdError",
    "RetrievalDiagnostics",
    "RetrievalResult",
    "Retriever",
    "SourceProvenance",
    "ThresholdTable",
    "ValidationIssue",
    "ValidationResult",
    "validate",
]
