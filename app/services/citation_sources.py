"""Resolve citation markers in a reply to real, retrieved source metadata.

Only IDs that (a) were part of the retrieved evidence set and (b) still
appear in the validated response are resolved. Unknown or unindexed markers
are omitted rather than displayed with guessed titles, pages, publishers, or
URLs.
"""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass

from app.rag.knowledge_base import all_entries
from app.services.corpus_evidence import get_corpus_index

logger = logging.getLogger(__name__)

_MARKER_RE = re.compile(r"\[source:([^\]\s]+)\]")


@dataclass(frozen=True)
class ResolvedCitationSource:
    id: str
    title: str
    kind: str
    page: str | None = None
    section: str | None = None
    publisher: str | None = None
    publication_date: str | None = None
    source: str | None = None


def _format_pages(pages: object) -> str | None:
    if not isinstance(pages, list) or not pages:
        return None
    numbers = [str(page) for page in pages if isinstance(page, int) or str(page).isdigit()]
    if not numbers:
        return None
    if len(numbers) == 1:
        return f"p. {numbers[0]}"
    return f"pp. {numbers[0]}-{numbers[-1]}"


def resolve_citation_sources(
    response: str, cited_ids: tuple[str, ...] | set[str] | None = None
) -> tuple[ResolvedCitationSource, ...]:
    if not response:
        return ()
    allowed = set(cited_ids) if cited_ids is not None else None
    ordered_ids = tuple(
        citation_id
        for citation_id in dict.fromkeys(_MARKER_RE.findall(response))
        if allowed is None or citation_id in allowed
    )
    if not ordered_ids:
        return ()

    internal = {entry.id: entry for entry in all_entries()}
    # Only load the (expensive) corpus index when at least one citation is
    # not already resolvable from the internal knowledge base.
    corpus = None
    if any(citation_id not in internal for citation_id in ordered_ids):
        try:
            corpus = get_corpus_index()
        except Exception as exc:
            logger.info("Citation source corpus unavailable (%s); using internal metadata", type(exc).__name__)

    resolved: list[ResolvedCitationSource] = []
    for citation_id in ordered_ids:
        entry = internal.get(citation_id)
        if entry:
            resolved.append(
                ResolvedCitationSource(
                    id=entry.id,
                    title=entry.title,
                    kind="internal_knowledge",
                    source=entry.source,
                )
            )
            continue
        passage = corpus.passage(citation_id) if corpus is not None else None
        if passage:
            resolved.append(
                ResolvedCitationSource(
                    id=citation_id,
                    title=str(passage.get("title") or citation_id),
                    kind="medical_corpus",
                    page=_format_pages(passage.get("pages")),
                    section=(str(passage["section"]).strip() or None) if passage.get("section") else None,
                    publisher=(str(passage["publisher"]).strip() or None) if passage.get("publisher") else None,
                    publication_date=(
                        str(passage["publication_date"]).strip() or None
                    )
                    if passage.get("publication_date")
                    else None,
                )
            )
    return tuple(resolved)


def as_source_dicts(sources: tuple[ResolvedCitationSource, ...]) -> list[dict]:
    return [asdict(source) for source in sources]
