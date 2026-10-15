"""Safety-layer tests: urgent/crisis detection and emergency precedence.

Detection is a narrowly scoped safety aid, not a diagnostic system. Templates
are drafts pending clinical review (see app.services.safety) — these tests
verify routing behavior, not clinical validity.
"""

import pytest

from app.rag.prompt_templates import REQUIRED_DISCLAIMER
from app.schemas.health import ChatRequest
from app.services.chat_service import ChatbotService
from app.services.safety import (
    REVIEW_STATUS,
    detect_urgent_symptoms,
    urgent_response,
)
from tests.conftest import make_chat_user

SELF_HARM_POSITIVES = [
    "I want to kill myself",
    "I have been thinking about suicide lately",
    "I want to KILL MYSELF",  # case-insensitive
    "I kil myself yesterday",  # misspelling still matches 'kill mysel'
    "I want to end my life",
    "मैं आत्महत्या के बारे में सोच रही हूँ",
    "ನನಗೆ ಆತ್ಮಹತ್ಯೆ ಮಾಡಿಕೊಳ್ಳುವ ಆಲೋಚನೆ ಬರುತ್ತಿದೆ",
    "எனக்கு தற்கொலை எண்ணங்கள் வருகின்றன",
    "నాకు ఆత్మహత్య ఆలోచనలు వస్తున్నాయి",
    "എനിക്ക് ആത്മഹത്യാ ചിന്തകൾ വരുന്നു",
]

URGENT_POSITIVES = [
    "I have heavy bleeding and severe abdominal pain",
    "I fainted twice today and can't breathe properly",
    "My wife had seizures and high fever after delivery",
    "Severe headache with vision changes since morning",
    "मुझे बहुत खून बह रहा है और तेज दर्द है",
    "ನನಗೆ ಭಾರೀ ರಕ್ತಸ್ರಾವ ಮತ್ತು ತೀವ್ರ ನೋವು ಇದೆ",
    "எனக்கு அதிக இரத்தப்போக்கு மற்றும் கடுமையான வலி",
    "నాకు భారీ రక్తస్రావం మరియు తీవ్రమైన నొప్పి",
    "എനിക്ക് കനത്ത രക്തസ്രാവവും കഠിനമായ വേദനയുമുണ്ട്",
]

ROUTINE_NEGATIVES = [
    "I feel tired today, what foods give energy?",
    "I have mild cramps during my period, is that normal?",
    "My baby has a slight fever, should I worry?",
    "I have a headache from lack of sleep",
    "How do I track my cycle length?",
    "What are common signs of PCOS?",
    "I feel sad sometimes after delivery",
    "मुझे थकान है, क्या खाना चाहिए?",
    "నాకు తలనొప్పిగా ఉంది",
    "ನನಗೆ ಸುಸ್ತಾಗಿದೆ, ಏನು ತಿನ್ನಬೇಕು?",
    "எனக்கு சோர்வாக இருக்கிறது, என்ன சாப்பிடலாம்?",
    "എനിക്ക് ക്ഷീണമുണ്ട്, എന്ത് കഴിക്കണം?",
    "I am feeling tired, mujhe neend nahi aati",
    "mera mood kharab hai, what should I do?",
    "",
    None,
]


@pytest.mark.parametrize("text", SELF_HARM_POSITIVES)
def test_self_harm_detected(text):
    assert detect_urgent_symptoms(text) == "self_harm"


@pytest.mark.parametrize("text", URGENT_POSITIVES)
def test_urgent_medical_detected(text):
    assert detect_urgent_symptoms(text) == "urgent_medical"


@pytest.mark.parametrize("text", ROUTINE_NEGATIVES)
def test_routine_questions_never_trigger(text):
    assert detect_urgent_symptoms(text) is None


def test_self_harm_takes_precedence_over_medical():
    assert detect_urgent_symptoms("I fainted and I want to kill myself") == "self_harm"


def test_templates_are_marked_pending_review_not_validated():
    assert REVIEW_STATUS == "pending-clinical-review"
    assert "112" in urgent_response("self_harm")
    assert "112" in urgent_response("urgent_medical")
    for body in (urgent_response("self_harm"), urgent_response("urgent_medical")):
        lowered = body.lower()
        assert "validat" not in lowered
        assert "approv" not in lowered
        assert "diagnos" not in lowered


async def test_emergency_path_skips_generation_and_persists(db_session, monkeypatch):
    from app.services import chat_service as chat_module

    def _forbidden(*args, **kwargs):
        raise AssertionError("generation must not run on the emergency path")

    monkeypatch.setattr(chat_module.GeminiService, "generate_response", _forbidden)
    user = await make_chat_user(db_session, email="crisis@example.com")
    service = ChatbotService(db_session)
    chat = await service.message(user, ChatRequest(message="I want to kill myself", language="en"))
    assert chat.message == "I want to kill myself"
    assert "112" in chat.response
    assert REQUIRED_DISCLAIMER in chat.response
    assert "[source:" not in chat.response


async def test_emergency_path_works_in_hindi(db_session, monkeypatch):
    from app.services import chat_service as chat_module

    def _forbidden(*args, **kwargs):
        raise AssertionError("generation must not run on the emergency path")

    monkeypatch.setattr(chat_module.GeminiService, "generate_response", _forbidden)
    user = await make_chat_user(db_session, email="crisis-hi@example.com")
    service = ChatbotService(db_session)
    chat = await service.message(user, ChatRequest(message="मुझे बहुत खून बह रहा है", language="hi"))
    assert "112" in chat.response
    assert REQUIRED_DISCLAIMER in chat.response
    assert chat.language == "hi"
