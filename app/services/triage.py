"""Deterministic-first chat triage (ROUTINE / NEEDS_ATTENTION / URGENT).

Triage is separate from retrieval relevance: it classifies the mother's
message using versioned rules only. The LLM never decides whether an
emergency exists.

- URGENT delegates to the safety gate's versioned phrase lists
  (app.services.safety) -- the same lists that drive the immediate
  safety response, so triage can never contradict the safety gate.
- NEEDS_ATTENTION matches conservative, non-diagnostic distress signals
  (TRIAGE_RULES_VERSION below). These are prompts for human review and
  supportive follow-up, not diagnoses.
- Everything else is ROUTINE. Ordinary tiredness or sadness alone is
  ROUTINE by design; persistence/escalation cues raise NEEDS_ATTENTION.

Status: rules are DRAFTS PENDING CLINICAL REVIEW, like the safety
templates. Do not claim clinical validation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum

from app.services.safety import REVIEW_STATUS as SAFETY_REVIEW_STATUS
from app.services.safety import detect_urgent_symptoms

logger = logging.getLogger(__name__)

TRIAGE_RULES_VERSION = "chat-triage-v1"
TRIAGE_REVIEW_STATUS = "pending-clinical-review"

# Conservative distress signals that warrant human review. Deliberately
# narrow and non-diagnostic: each phrase indicates the mother may need
# supportive follow-up, never a diagnosis. Matched case-insensitively as
# substrings, mirroring the safety gate's matching semantics.
NEEDS_ATTENTION_PHRASES = (
    "overwhelm",
    "can't cope",
    "cannot cope",
    "cant cope",
    "coping",
    "hopeless",
    "worthless",
    "no point",
    "giving up",
    "give up",
    "bad mother",
    "useless mother",
    "failure as a mother",
    "can't bond",
    "cannot bond",
    "cant bond",
    "no bond",
    "detached from my baby",
    "crying all the time",
    "crying constantly",
    "crying every day",
    "cry all day",
    "sad all the time",
    "sad for weeks",
    "sad every day",
    "empty inside",
    "feel numb",
    "feeling numb",
    "don't want to eat",
    "haven't eaten",
    "panic attack",
    "scared all the time",
    "afraid all the time",
    "no one understands",
    "all alone in this",
)


class TriageLevel(str, Enum):
    ROUTINE = "routine"
    NEEDS_ATTENTION = "needs_attention"
    URGENT = "urgent"


@dataclass(frozen=True)
class TriageDecision:
    level: TriageLevel
    reason: str
    rule_version: str = TRIAGE_RULES_VERSION
    matched: str | None = None


def triage_message(text: str | None) -> TriageDecision:
    """Classify a chat message deterministically. Never raises on bad input."""
    if not text or not text.strip():
        return TriageDecision(
            level=TriageLevel.ROUTINE,
            reason="empty or missing message text",
        )
    urgent_kind = detect_urgent_symptoms(text)
    if urgent_kind is not None:
        return TriageDecision(
            level=TriageLevel.URGENT,
            reason=f"safety gate matched kind={urgent_kind} review={SAFETY_REVIEW_STATUS}",
            matched=urgent_kind,
        )
    lowered = text.lower()
    for phrase in NEEDS_ATTENTION_PHRASES:
        if phrase in lowered:
            return TriageDecision(
                level=TriageLevel.NEEDS_ATTENTION,
                reason=f"distress signal matched review={TRIAGE_REVIEW_STATUS}",
                matched=phrase,
            )
    return TriageDecision(level=TriageLevel.ROUTINE, reason="no triage rule matched")
