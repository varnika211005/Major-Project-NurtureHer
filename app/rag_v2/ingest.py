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

_HEADING_NUMBERED_RE = re.compile(
    r"^((\d+\.)+\d*|[A-Z]\.\d+(\.\d+)*|Chapter\s+\d+\.?|Annex(\s+[A-Z])?|RECOMMENDATION\s+\d+)"
    r"(?=\s+[A-Z0-9]|\.\s+[A-Z]|$)"
)

# Multi-digit numbered title lines ("30. Self help plus ...",
# "86. A teen's guide ..."): in these corpora these are bibliography
# entries or front-matter items, never section headings (real sections
# number in single digits or letter prefixes). Never a heading.
_MULTI_DIGIT_TITLE_RE = re.compile(r"^\d{2,4}\.\s+[A-Z]")

# Bibliography entries: multi-digit numbers followed by an author name
# ("181. Willinger M", "35. Subba P ,"). Real section numbers in these
# corpora are short (5.8, A.4.1) or titled; reference lines are never
# legitimate section headings and never servable evidence passages.
_REF_ENTRY_RE = re.compile(r"^\d{2,4}\.\s+[A-Z][\w\-']*(?:\s+(?:[A-Z]\.?|,|;|&|\())")

# Single-digit author lines ("9. Gavin NI,"): also references. Legitimate
# single-digit guidance lists never pair a bare number with an author name,
# so this pattern is safe for heading exclusion and zone detection alike.
_REF_AUTHOR_ANY_RE = re.compile(r"^\d{1,4}\.\s+[A-Z][\w\-']*(?:\s+(?:[A-Z]\.?|,|;|&|\())")


def _is_reference_line(line: str) -> bool:
    stripped = line.strip()
    if _REF_ENTRY_RE.match(stripped) or _REF_AUTHOR_ANY_RE.match(stripped):
        return True
    lowered = stripped.lower()
    return "doi:" in lowered or "https://" in lowered or "http://" in lowered


_REF_ZONE_MARKER_RE = re.compile(
    r"^\d{2,4}\.\s+[A-Z]|https?://|doi:|\bet al\.|pp\.\s*\d+|Geneva:|New York|Capetown|Press\b|Toolkit|database",
    re.IGNORECASE,
)


def _looks_bibliographic(line: str) -> bool:
    """One line's worth of evidence it belongs to a reference list.

    Covers author-style entries ("181. Willinger M,"), title-style entries
    ("30. Self help plus ...", "86. A teen's guide ...") via the
    multi-digit-numbered-line marker, and publisher/URL markers. A single
    flagged line means nothing on its own; only runs of 3+ form a zone, so
    ordinary numbered guidance lists and inline citations are unaffected.
    """
    stripped = line.strip()
    if not stripped:
        return False
    if _REF_ENTRY_RE.match(stripped) or _REF_AUTHOR_ANY_RE.match(stripped):
        return True
    return bool(_REF_ZONE_MARKER_RE.search(stripped))


def mark_reference_zones(lines: list[str], min_run: int = 3) -> list[bool]:
    """Flag lines inside bibliography zones (reference lists).

    A line continues the current entry when it starts lowercase (wrapped
    author/title text) or is itself bibliography-looking; anything else
    ends the entry. Only runs of at least `min_run` flagged lines form a
    zone, so isolated inline citations inside real guidance never qualify.
    Short capitalized content lines always break a run (safe direction:
    guidance is kept). Purely structural.
    """
    zones = [False] * len(lines)
    run_start: int | None = None
    run_count = 0
    in_entry = False
    for index, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            in_entry = False
            continue
        strict = _looks_bibliographic(line)
        continuation = in_entry and (stripped[0].islower() or strict)
        if strict or continuation:
            if run_start is None:
                run_start = index
            run_count += 1
            in_entry = True
        else:
            if run_start is not None and run_count >= min_run:
                for j in range(run_start, index):
                    zones[j] = True
            run_start = None
            run_count = 0
            in_entry = False
    if run_start is not None and run_count >= min_run:
        for j in range(run_start, len(lines)):
            zones[j] = True
    return zones


_TEMPLATE_JUNK_RE = re.compile(r"\(Name\)|\(Insert ")


def _has_dot_leaders_or_template(line: str) -> bool:
    stripped = line.strip()
    if "..." in stripped or stripped.count(".") >= 6:
        return True
    return bool(_TEMPLATE_JUNK_RE.search(stripped))


def _is_template_or_toc_junk(line: str) -> bool:
    """Table-of-contents dot leaders, trailing page numbers, template placeholders.

    Applied to ALL-CAPS candidates only: numbered sections (including
    "RECOMMENDATION 18") legitimately end in numbers, so the trailing-page
    rule must never reject them.
    """
    stripped = line.strip()
    if _has_dot_leaders_or_template(line):
        return True
    return bool(re.search(r"\s+\d{1,3}$", stripped))


def is_bibliography_chunk(text: str, threshold: float = 0.5) -> bool:
    """True when multi-line text is dominated by bibliography entries.

    MUST be evaluated on raw (line-preserving) text, never on
    whitespace-collapsed chunk text. Two independent triggers: at least
    two author-style entries, or at least `threshold` fraction of lines
    inside reference zones (catches title-style entries via their
    numbered/URL/publisher context). Content that merely cites sources
    stays below both. Structural hygiene only: bibliography chunks can
    score highly on topical queries (shared author/title terms) while
    offering no guidance, so they must never be servable evidence.
    """
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return False
    if (
        sum(
            1
            for line in lines
            if _REF_ENTRY_RE.match(line.strip()) or _REF_AUTHOR_ANY_RE.match(line.strip())
        )
        >= 2
    ):
        return True
    zones = mark_reference_zones(lines)
    return sum(zones) / len(lines) >= threshold


def _is_shout_heading(line: str) -> bool:
    stripped = line.strip()
    if not 4 <= len(stripped) <= 90:
        return False
    if stripped[-1] in ".!?,;:":
        return False
    letters = [char for char in stripped if char.isalpha()]
    if len(letters) < 4:
        return False
    return stripped == stripped.upper()


def extract_headings(page_text: str) -> list[tuple[int, str]]:
    """Find document-structure headings on one page.

    Returns (char_offset, heading_text) in document order, using numbered
    section markers (1.2, A.4.1, Chapter 3, RECOMMENDATION 18) plus
    conservative ALL-CAPS lines. Bibliography lines (author entries,
    title-style numbered entries, URLs) and zone-flagged reference lines
    are never headings. Purely structural: it describes where a passage
    sits, never what it means clinically. Deterministic for identical input.
    """
    headings: list[tuple[int, str]] = []
    raw_lines = page_text.splitlines(keepends=True)
    zones = mark_reference_zones([line for line in page_text.splitlines()])
    offset = 0
    for index, line in enumerate(raw_lines):
        stripped = line.strip()
        if not stripped or _is_reference_line(stripped) or (index < len(zones) and zones[index]):
            offset += len(line)
            continue
        if _HEADING_NUMBERED_RE.match(stripped):
            if _MULTI_DIGIT_TITLE_RE.match(stripped):
                # Multi-digit numbered title lines ("30. Self help ...") are
                # bibliography entries or front-matter items in these corpora,
                # never section headings (real sections number in single
                # digits or letter prefixes).
                offset += len(line)
                continue
            if not _has_dot_leaders_or_template(stripped):
                headings.append((offset, stripped[:120]))
        elif _is_shout_heading(stripped) and not _is_template_or_toc_junk(stripped):
            headings.append((offset, stripped[:120]))
        offset += len(line)
    return headings


def section_at(headings: list[tuple[int, str]], offset: int, carry: str = "") -> str:
    """Nearest preceding heading at or before offset; carry-over otherwise."""
    current = carry
    for position, heading in headings:
        if position > offset:
            break
        current = heading
    return current


def clean_text(body: str) -> str:
    """Collapse whitespace; drop empty/whitespace-only content."""
    return _WS_RE.sub(" ", body).strip()


def clean_with_map(text: str) -> tuple[str, list[int]]:
    """clean_text plus a cleaned-index -> raw-offset map.

    mapping[i] is a raw offset locating cleaned[i]: content characters map
    to themselves, separator spaces map to the following content character.
    Structure found in raw coordinates (e.g. heading line offsets) can thus
    be located for any cleaned window start. len(mapping) == len(cleaned).
    """
    parts: list[str] = []
    mapping: list[int] = []
    text = re.sub(r"\s+$", "", text)
    pos = 0
    for match in _WS_RE.finditer(text):
        start, end = match.span()
        if start > pos:
            if parts:
                parts.append(" ")
                mapping.append(end)
            segment = text[pos:start]
            parts.append(segment)
            mapping.extend(range(pos, start))
        pos = end
    if pos < len(text):
        if parts:
            parts.append(" ")
            mapping.append(pos)
        segment = text[pos:]
        parts.append(segment)
        mapping.extend(range(pos, len(text)))
    cleaned = "".join(parts)
    assert len(mapping) == len(cleaned)
    return cleaned, mapping


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
