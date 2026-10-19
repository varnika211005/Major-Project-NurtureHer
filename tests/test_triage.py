"""Deterministic chat-triage tests: ROUTINE / NEEDS_ATTENTION / URGENT.

No database, no network, no LLM. Triage is rules-only; the LLM never
decides whether an emergency exists. Rules are drafts pending clinical
review -- these tests pin routing behavior, not clinical validity.
"""

from app.services.triage import (
    NEEDS_ATTENTION_PHRASES,
    TRIAGE_RULES_VERSION,
    TriageLevel,
    triage_message,
)


def test_tired_is_routine():
    decision = triage_message("I feel tired.")
    assert decision.level == TriageLevel.ROUTINE
    assert decision.rule_version == TRIAGE_RULES_VERSION


def test_sad_alone_is_routine_not_emergency():
    for text in ("I feel sad.", "I feel sad sometimes.", "Feeling a bit sad today."):
        decision = triage_message(text)
        assert decision.level == TriageLevel.ROUTINE, text


def test_overwhelmed_needs_attention():
    decision = triage_message("I feel overwhelmed and don't know what to do.")
    assert decision.level == TriageLevel.NEEDS_ATTENTION
    assert decision.matched is not None


def test_persistent_distress_signals_need_attention():
    for text in (
        "I feel hopeless about everything.",
        "I have been crying all the time.",
        "I can't bond with my baby and I feel worthless.",
        "I had a panic attack last night.",
    ):
        assert triage_message(text).level == TriageLevel.NEEDS_ATTENTION, text


def test_urgent_delegates_to_safety_gate():
    for text, kind in (
        ("I want to kill myself", "self_harm"),
        ("I have heavy bleeding after delivery", "urgent_medical"),
        ("I can't breathe properly", "urgent_medical"),
    ):
        decision = triage_message(text)
        assert decision.level == TriageLevel.URGENT, text
        assert decision.matched == kind


def test_triage_never_raises_on_bad_input():
    for text in ("", "   ", None):
        assert triage_message(text).level == TriageLevel.ROUTINE


def test_distress_list_is_conservative_and_versioned():
    assert TRIAGE_RULES_VERSION == "chat-triage-v1"
    assert len(NEEDS_ATTENTION_PHRASES) > 0
    # No phrase may overlap the safety gate's urgent lists semantics:
    # triage URGENT comes only from the safety gate, never from this list.
    assert "suicide" not in NEEDS_ATTENTION_PHRASES
    assert "kill myself" not in NEEDS_ATTENTION_PHRASES
