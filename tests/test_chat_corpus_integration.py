"""End-to-end chat flow tests: triage, corpus/v1 retrieval, escalation, citations.

Real SQLite, real MiniLM corpus retrieval, stubbed Gemini generation and
stubbed Celery delivery. No network, no API keys. Each scenario asserts the
full path: reply content, persistence, case/alert side effects (or their
absence), and citation validity.
"""

import pytest
from sqlalchemy import select

from app.core.security import UserRole
from app.models.asha import Alert, HighRiskCase
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.user import User
from app.schemas.health import ChatRequest
from app.services.chat_service import ChatbotService
from app.services.corpus_evidence import reset_corpus_index
from app.services.gemini_service import GeminiService
from tests.conftest import make_chat_user


@pytest.fixture(autouse=True)
def _fresh_corpus():
    reset_corpus_index()
    yield
    reset_corpus_index()


@pytest.fixture
def _no_sms(monkeypatch):
    calls = []

    def _fake_delay(alert_id, phone, message):
        calls.append((alert_id, phone, message))

    monkeypatch.setattr("app.workers.tasks.send_sms_alert.delay", _fake_delay)
    return calls


@pytest.fixture
def _canned_gemini(monkeypatch):
    async def _canned(self, prompt, language="en"):
        return "Canned guidance. Rest and fluids help recovery."

    async def _no_translate(self, text, language):
        return None

    monkeypatch.setattr(GeminiService, "generate_response", _canned)
    monkeypatch.setattr(GeminiService, "translate_to_english", _no_translate)


async def _user(db_session, email, role, phone=None):
    user = User(
        email=email, name=email.split("@")[0], password_hash="x", role=role,
        preferred_language="en", is_active=True, is_verified=True, phone=phone,
    )
    db_session.add(user)
    await db_session.commit()
    return user


async def _linked_family(db_session, tag):
    mother = await make_chat_user(db_session, email=f"{tag}-mother@example.com")
    doctor = await _user(db_session, f"{tag}-doc@example.com", UserRole.DOCTOR, phone="+911000000001")
    caregiver = await _user(db_session, f"{tag}-care@example.com", UserRole.CAREGIVER, phone="+911000000002")
    db_session.add(DoctorPatient(doctor_id=doctor.id, patient_id=mother.id, status="active"))
    db_session.add(
        CareCircleAccess(
            user_id=mother.id, requester_id=caregiver.id, status="approved",
            share_emergency=True, share_risk_category=True,
            share_wellness_summary=True, share_doctor_notes=False,
        )
    )
    await db_session.commit()
    return mother, doctor, caregiver


async def _cases_and_alerts(db_session):
    cases = (await db_session.execute(select(HighRiskCase))).scalars().all()
    alerts = (await db_session.execute(select(Alert))).scalars().all()
    return cases, alerts


async def test_tired_gets_support_without_escalation(db_session, _canned_gemini, _no_sms):
    mother = await make_chat_user(db_session, email="e2e-tired@example.com")
    chat = await ChatbotService(db_session).message(mother, ChatRequest(message="I feel tired.", language="en"))
    assert "It may make mistakes" in chat.response
    assert chat.message == "I feel tired."
    cases, alerts = await _cases_and_alerts(db_session)
    assert cases == [] and alerts == []


async def test_sadness_alone_is_not_an_emergency(db_session, _canned_gemini, _no_sms):
    mother = await make_chat_user(db_session, email="e2e-sad@example.com")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="I feel sad sometimes.", language="en")
    )
    assert "112" not in chat.response
    assert "It may make mistakes" in chat.response
    cases, alerts = await _cases_and_alerts(db_session)
    assert cases == [] and alerts == []


async def test_overwhelmed_opens_case_without_alerts(db_session, _canned_gemini, _no_sms):
    mother, _doctor, _caregiver = await _linked_family(db_session, "e2e-att")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="I feel overwhelmed and don't know what to do.", language="en")
    )
    assert "It may make mistakes" in chat.response
    cases, alerts = await _cases_and_alerts(db_session)
    assert len(cases) == 1 and cases[0].risk_level.value == "moderate"
    assert alerts == [] and _no_sms == []


async def test_urgent_warning_sign_template_case_and_alerts(db_session, _canned_gemini, _no_sms):
    mother, doctor, caregiver = await _linked_family(db_session, "e2e-urg")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="I have heavy bleeding after delivery.", language="en")
    )
    assert "112" in chat.response
    cases, alerts = await _cases_and_alerts(db_session)
    assert len(cases) == 1 and cases[0].risk_level.value == "high"
    assert {a.user_id for a in alerts} == {doctor.id, caregiver.id}
    assert len(_no_sms) == 2


async def test_self_harm_skips_generation_and_escalates(db_session, monkeypatch, _no_sms):
    async def _forbidden(self, prompt, language="en"):
        raise AssertionError("generation must be bypassed")

    async def _no_translate(self, text, language):
        return None

    monkeypatch.setattr(GeminiService, "generate_response", _forbidden)
    monkeypatch.setattr(GeminiService, "translate_to_english", _no_translate)
    mother, _doctor, _caregiver = await _linked_family(db_session, "e2e-sh")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="I want to kill myself.", language="en")
    )
    assert "112" in chat.response
    assert "[source:" not in chat.response
    cases, alerts = await _cases_and_alerts(db_session)
    assert len(cases) == 1
    assert len(alerts) == 2


async def test_missing_evidence_returns_uncertainty_without_citations(
    db_session, _canned_gemini, _no_sms
):
    mother = await make_chat_user(db_session, email="e2e-miss@example.com")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="What is the capital of France?", language="en")
    )
    assert "don't have enough reliable information" in chat.response
    assert "[source:" not in chat.response
    cases, alerts = await _cases_and_alerts(db_session)
    assert cases == [] and alerts == []


async def test_fabricated_citations_stripped_valid_kept(db_session, monkeypatch, _no_sms):
    async def _canned(self, prompt, language="en"):
        return "Canned [source:pcos_guidance_001] plus [source:miracle_cure_999] end."

    async def _retrieve(self, user, query, language):
        return ("retrieved context", "user context", ("pcos_guidance_001",))

    monkeypatch.setattr(GeminiService, "generate_response", _canned)
    monkeypatch.setattr(ChatbotService, "_retrieve", _retrieve)
    mother = await make_chat_user(db_session, email="e2e-cite@example.com")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="What are the signs of PCOS?", language="en")
    )
    assert "[source:pcos_guidance_001]" in chat.response
    assert "miracle_cure_999" not in chat.response


async def test_escalation_failure_never_breaks_reply(db_session, monkeypatch, _canned_gemini, _no_sms):
    async def _boom(*args, **kwargs):
        raise RuntimeError("escalation backend down")

    monkeypatch.setattr("app.services.chat_service.escalate_from_chat", _boom)
    mother = await make_chat_user(db_session, email="e2e-fail@example.com")
    chat = await ChatbotService(db_session).message(
        mother, ChatRequest(message="I have heavy bleeding after delivery.", language="en")
    )
    assert "112" in chat.response


async def test_history_isolated_per_mother(db_session, _canned_gemini, _no_sms):
    mother_a = await make_chat_user(db_session, email="e2e-a@example.com")
    mother_b = await make_chat_user(db_session, email="e2e-b@example.com")
    service = ChatbotService(db_session)
    await service.message(mother_a, ChatRequest(message="I feel tired.", language="en"))
    history_a = await service.history(mother_a)
    history_b = await service.history(mother_b)
    assert len(history_a) == 1 and history_b == []
