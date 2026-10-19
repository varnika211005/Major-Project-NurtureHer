"""RAG v2 evidence gating (P3).

Classifies a ranked retrieval result as SUFFICIENT, INSUFFICIENT, or
AMBIGUOUS. Ambiguity is a meaningful distinction between competing topics —
not merely two documents with similar scores: it requires the top
contenders to belong to different topics.

An AMBIGUOUS verdict yields a concise clarification question naming the
candidate topics. The question contains no medical advice, no facts, and no
recommendations — only the topic labels needed to disambiguate.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class EvidenceVerdict(str, Enum):
    SUFFICIENT = "sufficient"
    INSUFFICIENT = "insufficient"
    AMBIGUOUS = "ambiguous"


@dataclass(frozen=True)
class EvidenceDecision:
    verdict: EvidenceVerdict
    reason: str
    candidate_topics: tuple[str, ...] = ()
    top_score: float = 0.0

    def clarification_question(self, topic_labels: dict[str, str] | None = None) -> str:
        """Concise clarification naming candidate topics; no medical content."""
        labels = [topic_labels.get(t, t) if topic_labels else t for t in self.candidate_topics]
        if len(labels) >= 2:
            return (
                "To point you to the right information, could you clarify: is your "
                f"question mostly about {labels[0]}, or about {labels[1]}?"
            )
        if labels:
            return f"To point you to the right information, is your question mostly about {labels[0]}?"
        return "Could you say a little more about what your question focuses on?"


@dataclass
class EvidenceGate:
    """Decides whether ranked retrieval results constitute evidence.

    `ambiguity_margin`: two top documents from *different topics* within
    this cosine margin of each other trigger AMBIGUOUS. This is a structural
    tie rule, not a relevance claim; the default (0.05) treats near-ties as
    genuinely hard to call on a [-1, 1] cosine scale. Must be finite and
    non-negative; anything else raises ValueError at construction.

    `min_score`: absolute minimum-score floor applied to the top result.
    `None` (the default) means unconfigured/test mode — no floor is
    enforced. Any future orchestration path MUST explicitly supply the
    backend-calibrated threshold (see ThresholdTable.get) instead of
    relying on the default. When set, must be a finite number.

    Fail-closed policy: configuration errors raise (ValueError here,
    MissingThresholdError for threshold tables); doubtful *data* —
    empty rankings, malformed entries, non-finite scores, unknown
    topics, below-floor top scores — yields INSUFFICIENT, never an
    exception and never SUFFICIENT.
    """

    ambiguity_margin: float = 0.05
    min_score: float | None = None

    def __post_init__(self) -> None:
        if (
            isinstance(self.ambiguity_margin, bool)
            or not isinstance(self.ambiguity_margin, (int, float))
            or not math.isfinite(self.ambiguity_margin)
            or self.ambiguity_margin < 0
        ):
            raise ValueError(
                f"ambiguity_margin must be a finite number >= 0, got {self.ambiguity_margin!r}"
            )
        if self.min_score is not None and (
            isinstance(self.min_score, bool)
            or not isinstance(self.min_score, (int, float))
            or not math.isfinite(self.min_score)
        ):
            raise ValueError(f"min_score must be a finite number or None, got {self.min_score!r}")

    def decide(
        self,
        ranked: list[tuple[str, float]],
        topics_of: dict[str, str],
    ) -> EvidenceDecision:
        if not isinstance(ranked, (list, tuple)) or not ranked:
            return EvidenceDecision(
                verdict=EvidenceVerdict.INSUFFICIENT,
                reason="empty retrieval result",
                top_score=0.0,
            )
        cleaned: list[tuple[str, float]] = []
        for entry in ranked:
            try:
                doc_id, score = entry
            except (TypeError, ValueError):
                return EvidenceDecision(
                    verdict=EvidenceVerdict.INSUFFICIENT,
                    reason="malformed ranking entries",
                    top_score=0.0,
                )
            if (
                not isinstance(doc_id, str)
                or isinstance(score, bool)
                or not isinstance(score, (int, float))
                or not math.isfinite(score)
            ):
                return EvidenceDecision(
                    verdict=EvidenceVerdict.INSUFFICIENT,
                    reason="malformed or non-finite ranking entries",
                    top_score=0.0,
                )
            cleaned.append((doc_id, float(score)))
        cleaned.sort(key=lambda item: item[1], reverse=True)
        top_id, top_score = cleaned[0]
        if self.min_score is not None and top_score < float(self.min_score):
            return EvidenceDecision(
                verdict=EvidenceVerdict.INSUFFICIENT,
                reason=f"top score {top_score:.4f} below minimum {float(self.min_score):.4f}",
                top_score=top_score,
            )
        lookup = topics_of if isinstance(topics_of, dict) else {}
        contenders = [(doc_id, score) for doc_id, score in cleaned if top_score - score <= self.ambiguity_margin]
        contender_topics = [lookup.get(doc_id, "") for doc_id, _ in contenders]
        distinct = [t for t in dict.fromkeys(contender_topics) if isinstance(t, str) and t]
        if len(distinct) >= 2:
            return EvidenceDecision(
                verdict=EvidenceVerdict.AMBIGUOUS,
                reason=f"top contenders span topics {distinct} within margin {self.ambiguity_margin}",
                candidate_topics=tuple(distinct[:2]),
                top_score=top_score,
            )
        if not distinct:
            return EvidenceDecision(
                verdict=EvidenceVerdict.INSUFFICIENT,
                reason="no known topics among top contenders",
                top_score=top_score,
            )
        return EvidenceDecision(
            verdict=EvidenceVerdict.SUFFICIENT,
            reason="top result stands clear of competing topics",
            candidate_topics=(distinct[0],) if distinct else (),
            top_score=top_score,
        )
