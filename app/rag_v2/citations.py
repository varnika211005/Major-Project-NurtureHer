"""RAG v2 citation validation (P3).

Every `[source:<id>]` marker in generated text must belong to the retrieved
evidence set for that response. Markers referencing unknown, malformed, or
absent IDs are stripped; the surrounding prose is preserved. Stripping a bad
marker never implies the remaining text is grounded — callers must still
route ungrounded output through the uncertainty path.

Only violation counts and IDs are logged; never response text or queries.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Strict markers first; anything else that opens like a source marker
# (empty id, whitespace, wrong case, unclosed) is malformed. Single pass so
# valid markers are never re-examined by the malformed branch.
_COMBINED_RE = re.compile(r"\[source:(?P<valid>[^\]\s]+)\]" r"|\[(?:source|SOURCES?|Source):[^\]]*\]?" r"|\[source:$")


@dataclass(frozen=True)
class CitationReport:
    valid_ids: tuple[str, ...] = ()
    stripped_unknown: tuple[str, ...] = ()
    stripped_malformed_count: int = 0
    # Explicitly NOT a groundedness claim: validation only checks marker
    # membership in the retrieved set. Grounding requires generation-time
    # provenance, which lives outside this module.
    text_grounding_established: bool = False


@dataclass(frozen=True)
class CitationResult:
    text: str
    report: CitationReport = field(default_factory=CitationReport)


def validate(text: str, cited_ids: set[str] | tuple[str, ...]) -> CitationResult:
    """Strip malformed/fabricated `[source:]` markers; keep valid ones."""
    allowed = set(cited_ids)
    valid: list[str] = []
    unknown: list[str] = []
    malformed = 0

    def _replace(match: re.Match) -> str:
        nonlocal malformed
        raw_id = match.group("valid")
        if raw_id is None:
            malformed += 1
            return ""
        if raw_id in allowed:
            valid.append(raw_id)
            return match.group(0)
        unknown.append(raw_id)
        return ""

    cleaned = _COMBINED_RE.sub(_replace, text)
    if unknown or malformed:
        logger.info(
            "rag_v2 citations stripped: unknown=%d malformed=%d",
            len(unknown),
            malformed,
        )
    return CitationResult(
        text=cleaned,
        report=CitationReport(
            valid_ids=tuple(dict.fromkeys(valid)),
            stripped_unknown=tuple(dict.fromkeys(unknown)),
            stripped_malformed_count=malformed,
        ),
    )
