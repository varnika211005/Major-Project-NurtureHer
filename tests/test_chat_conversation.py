from app.rag.prompt_templates import (
    build_ambiguous_evidence_response,
    build_insufficient_evidence_response,
)
from app.services.conversation_router import (
    ConversationalIntent,
    classify_conversational_intent,
    conversational_response,
)


def test_greetings_are_conversational():
    assert classify_conversational_intent("Hello!") == ConversationalIntent.GREETING
    assert classify_conversational_intent("नमस्ते") == ConversationalIntent.GREETING
    assert classify_conversational_intent("ನಮಸ್ಕಾರ") == ConversationalIntent.GREETING


def test_thanks_are_conversational():
    assert classify_conversational_intent("Thank you so much.") == ConversationalIntent.THANKS
    assert classify_conversational_intent("धन्यवाद") == ConversationalIntent.THANKS


def test_medical_queries_never_take_conversational_path():
    assert classify_conversational_intent("Hi, what are the signs of PCOS?") is None
    assert classify_conversational_intent("I feel sad because my period is late") is None
    assert classify_conversational_intent("What can you do about heavy bleeding?") is None


def test_emotional_checkins_are_conversational():
    assert classify_conversational_intent("I feel overwhelmed today") == ConversationalIntent.EMOTIONAL_CHECKIN
    assert classify_conversational_intent("मैं बहुत उदास हूँ") == ConversationalIntent.EMOTIONAL_CHECKIN


def test_capability_questions_are_conversational():
    assert classify_conversational_intent("What can you do?") == ConversationalIntent.CAPABILITIES


def test_every_supported_language_has_conversational_and_fallback_text():
    for language in ("en", "hi", "kn", "ta", "te", "ml"):
        for intent in ConversationalIntent:
            assert conversational_response(intent, language).strip()
        assert build_insufficient_evidence_response(language).strip()
        assert build_ambiguous_evidence_response(language).strip()
    assert "enough reliable" in build_insufficient_evidence_response("en")
    assert "मेरे पास" in build_insufficient_evidence_response("hi")
