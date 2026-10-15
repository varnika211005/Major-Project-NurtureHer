"""RAG v2 ingestion validation (P1).

Pure, deterministic, offline: no model downloads, no network calls, no
database access. Validates documents and splits the corpus into a
production-eligible set (approved + fully provenanced only) and a
quarantined set with machine-readable reasons. Pending or incompletely
sourced documents can never be production-eligible through this module.
"""

from __future__ import annotations

import re

from app.rag_v2.schemas import (
    ALLOWED_LANGUAGES,
    ALLOWED_REVIEW_STATUS,
    Chunk,
    CorpusManifest,
    MedicalDocument,
    ValidationIssue,
    ValidationResult,
)

_WS_RE = re.compile(r"\s+")


def clean_text(body: str) -> str:
    """Collapse whitespace; drop empty/whitespace-only content."""
    return _WS_RE.sub(" ", body).strip()


def record_language(doc: MedicalDocument) -> str:
    """Record the declared language if supported, else mark unknown.

    This records metadata only — it performs no translation, no
    transliteration, and no semantic language identification.
    """
    return doc.language if doc.language in ALLOWED_LANGUAGES else "unknown"


def chunk_text(
    doc_id: str,
    text: str,
    language: str,
    topics: tuple[str, ...],
    max_chars: int = 1200,
    overlap_chars: int = 180,
) -> list[Chunk]:
    """Sliding-window character chunker with overlap.

    Deterministic: same input always yields the same chunks. Raises
    ValueError on non-positive window sizes.
    """
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    if overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("overlap_chars must satisfy 0 <= overlap_chars < max_chars")
    cleaned = clean_text(text)
    if not cleaned:
        return []
    step = max_chars - overlap_chars
    # Collect only windows that add uncovered text: stop once a window
    # reaches the end so no trailing empty/duplicate window is emitted.
    starts: list[int] = []
    for start in range(0, len(cleaned), step):
        starts.append(start)
        if start + max_chars >= len(cleaned):
            break
    total = len(starts)
    return [
        Chunk(
            doc_id=doc_id,
            index=index,
            of=total,
            text=cleaned[start : start + max_chars],
            language=language,
            topics=topics,
        )
        for index, start in enumerate(starts)
    ]


def validate_document(doc: MedicalDocument) -> ValidationIssue | None:
    """Return None when production-eligible, else the quarantine reason."""
    if not doc.id.strip():
        return ValidationIssue(doc_id="", reason="missing-id")
    if not doc.title.strip():
        return ValidationIssue(doc_id=doc.id, reason="missing-title")
    if not clean_text(doc.body):
        return ValidationIssue(doc_id=doc.id, reason="missing-body")
    if doc.language not in ALLOWED_LANGUAGES:
        return ValidationIssue(doc_id=doc.id, reason="unsupported-language")
    if doc.source is None:
        return ValidationIssue(doc_id=doc.id, reason="missing-provenance")
    if not doc.source.publisher.strip():
        return ValidationIssue(doc_id=doc.id, reason="missing-publisher")
    if not doc.source.url_or_path.strip():
        return ValidationIssue(doc_id=doc.id, reason="missing-source-location")
    if doc.source.review_status not in ALLOWED_REVIEW_STATUS:
        return ValidationIssue(doc_id=doc.id, reason="invalid-review-status")
    if doc.source.review_status != "approved":
        return ValidationIssue(doc_id=doc.id, reason="review-pending")
    return None


def validate_corpus(docs: list[MedicalDocument], manifest_version: str = "v1") -> tuple[ValidationResult, CorpusManifest]:
    """Split docs into eligible vs quarantined; build a deterministic manifest."""
    eligible: list[MedicalDocument] = []
    quarantined: list[ValidationIssue] = []
    for doc in docs:
        issue = validate_document(doc)
        if issue is None:
            eligible.append(doc)
        else:
            quarantined.append(issue)
    manifest = CorpusManifest(
        version=manifest_version,
        eligible_ids=tuple(sorted(doc.id for doc in eligible)),
        quarantined=tuple(quarantined),
    )
    return ValidationResult(eligible=tuple(eligible), quarantined=tuple(quarantined)), manifest
