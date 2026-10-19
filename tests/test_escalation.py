"""Escalation workflow tests: cases, recipients, alerts, cooldown.

Offline: in-memory SQLite, no network. SMS delivery is replaced with a
stubbed Celery delay; provider behavior is covered by contract tests, not
real delivery. Routine messages never escalate.
"""

import pytest
from sqlalchemy import select

from app.core.security import UserRole
from app.models.asha import Alert, HighRiskCase
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.enums import CaseStatus, RiskLevel
from app.models.user import User
from app.services.escalation import escalate_from_chat
from app.services.triage import TriageLevel
from tests.conftest import make_chat_user


@pytest.fixture
def _no_sms(monkeypatch):
    calls = []

    def _fake_delay(alert_id, phone, message):
        calls.append((alert_id, phone, message))

    monkeypatch.setattr("app.workers.tasks.send_sms_alert.delay", _fake_delay)
    return calls


async def _user(db_session, email, role, phone=None):
    user = User(
        email=email,
        name=email.split("@")[0],
        password_hash="x",
        role=role,
        preferred_language="en",
        is_active=True,
        is_verified=True,
        phone=phone,
    )
    db_session.add(user)
    await db_session.commit()
    return user


async def test_routine_never_escalates(db_session, _no_sms):
    mother = await make_chat_user(db_session)
    result = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.ROUTINE, kind="none", trigger_message="I feel tired."
    )
    assert result.created is False
    cases = (await db_session.execute(select(HighRiskCase))).scalars().all()
    assert cases == []
    assert _no_sms == []


async def test_urgent_creates_case_and_notifies_both(db_session, _no_sms):
    mother = await make_chat_user(db_session, email="esc-mother@example.com")
    doctor = await _user(db_session, "esc-doctor@example.com", UserRole.DOCTOR, phone="+911111111111")
    caregiver = await _user(db_session, "esc-care@example.com", UserRole.CAREGIVER, phone="+912222222222")
    db_session.add(DoctorPatient(doctor_id=doctor.id, patient_id=mother.id, status="active"))
    db_session.add(
        CareCircleAccess(
            user_id=mother.id, requester_id=caregiver.id, status="approved",
            share_emergency=True, share_risk_category=False,
            share_wellness_summary=False, share_doctor_notes=False,
        )
    )
    await db_session.commit()

    result = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.URGENT,
        kind="urgent_medical", trigger_message="I have heavy bleeding after delivery, please help.",
    )
    assert result.created is True
    assert result.case_id is not None
    assert set(result.notified_user_ids) == {doctor.id, caregiver.id}
    assert result.skipped_no_phone == []
    assert result.unassigned_doctor is False

    case = await db_session.get(HighRiskCase, result.case_id)
    assert case.risk_type == "chat_triage"
    assert case.risk_level == RiskLevel.HIGH
    assert case.status == CaseStatus.OPEN
    assert case.user_id == mother.id

    alerts = (await db_session.execute(select(Alert))).scalars().all()
    assert len(alerts) == 2
    by_user = {alert.user_id: alert for alert in alerts}
    assert set(by_user) == {doctor.id, caregiver.id}
    assert all(a.sent_status == "queued" for a in alerts)
    assert all("heavy bleeding after delivery" in a.message for a in alerts)
    assert all("escalation-policy-v1" in a.message for a in alerts)
    assert len(_no_sms) == 2


async def test_needs_attention_opens_case_without_notifications(db_session, _no_sms):
    mother = await make_chat_user(db_session, email="att-mother@example.com")
    doctor = await _user(db_session, "att-doctor@example.com", UserRole.DOCTOR, phone="+913333333333")
    db_session.add(DoctorPatient(doctor_id=doctor.id, patient_id=mother.id, status="active"))
    await db_session.commit()

    result = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.NEEDS_ATTENTION,
        kind="overwhelm", trigger_message="I feel overwhelmed and don't know what to do.",
    )
    assert result.created is True
    case = await db_session.get(HighRiskCase, result.case_id)
    assert case.risk_level == RiskLevel.MODERATE
    alerts = (await db_session.execute(select(Alert))).scalars().all()
    assert alerts == []
    assert _no_sms == []


async def test_cooldown_dedupes_repeat_escalation(db_session, _no_sms):
    mother = await make_chat_user(db_session, email="cool-mother@example.com")
    first = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.URGENT,
        kind="urgent_medical", trigger_message="I fainted twice today."
    )
    assert first.created is True
    second = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.URGENT,
        kind="urgent_medical", trigger_message="I fainted again just now."
    )
    assert second.created is False
    assert second.case_id == first.case_id
    assert "cooldown" in second.reason
    cases = (await db_session.execute(select(HighRiskCase))).scalars().all()
    assert len(cases) == 1


async def test_missing_recipients_recorded_not_failed(db_session, _no_sms):
    mother = await make_chat_user(db_session, email="alone-mother@example.com")
    caregiver = await _user(db_session, "nophone-care@example.com", UserRole.CAREGIVER, phone=None)
    db_session.add(
        CareCircleAccess(
            user_id=mother.id, requester_id=caregiver.id, status="approved",
            share_emergency=False, share_risk_category=True,
            share_wellness_summary=False, share_doctor_notes=False,
        )
    )
    await db_session.commit()

    result = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.URGENT,
        kind="self_harm", trigger_message="I want to kill myself."
    )
    assert result.created is True
    assert result.unassigned_doctor is True
    assert result.notified_user_ids == []
    assert result.skipped_no_phone == [caregiver.id]
    alerts = (await db_session.execute(select(Alert))).scalars().all()
    assert len(alerts) == 1
    assert alerts[0].sent_status == "skipped_no_phone"
    assert _no_sms == []


async def test_unconsented_caregiver_gets_no_alert(db_session, _no_sms):
    mother = await make_chat_user(db_session, email="priv-mother@example.com")
    stranger = await _user(db_session, "stranger@example.com", UserRole.CAREGIVER, phone="+914444444444")
    db_session.add(
        CareCircleAccess(
            user_id=mother.id, requester_id=stranger.id, status="pending",
            share_emergency=True, share_risk_category=True,
            share_wellness_summary=True, share_doctor_notes=False,
        )
    )
    await db_session.commit()

    result = await escalate_from_chat(
        db_session, user=mother, level=TriageLevel.URGENT,
        kind="urgent_medical", trigger_message="Emergency text."
    )
    assert result.created is True
    assert result.notified_user_ids == []
    alerts = (await db_session.execute(select(Alert))).scalars().all()
    assert alerts == []
