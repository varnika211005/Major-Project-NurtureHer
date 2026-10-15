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
    genuinely hard to call on a [-1, 1] cosine scale.
    """

    ambiguity_margin: float = 0.05

    def decide(
        self,
        ranked: list[tuple[str, float]],
        topics_of: dict[str, str],
    ) -> EvidenceDecision:
        if not ranked:
            return EvidenceDecision(
                verdict=EvidenceVerdict.INSUFFICIENT,
                reason="empty retrieval result",
                top_score=0.0,
            )
        top_id, top_score = ranked[0]
        contenders = [(doc_id, score) for doc_id, score in ranked if top_score - score <= self.ambiguity_margin]
        contender_topics = [topics_of.get(doc_id, "") for doc_id, _ in contenders]
        distinct = [t for t in dict.fromkeys(contender_topics) if t]
        if len(distinct) >= 2:
            return EvidenceDecision(
                verdict=EvidenceVerdict.AMBIGUOUS,
                reason=f"top contenders span topics {distinct} within margin {self.ambiguity_margin}",
                candidate_topics=tuple(distinct[:2]),
                top_score=top_score,
            )
        return EvidenceDecision(
            verdict=EvidenceVerdict.SUFFICIENT,
            reason="top result stands clear of competing topics",
            candidate_topics=(distinct[0],) if distinct else (),
            top_score=top_score,
        )
