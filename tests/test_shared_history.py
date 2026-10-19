"""Consented history-sharing tests: caregiver consent gates, doctor CareCircle authorization gates.

Route functions are invoked directly with an isolated SQLite session (HTTP
auth plumbing is unchanged and covered elsewhere). Every denial path must
raise 403/404 without leaking rows; every grant path must scope to the
correct mother.
"""

import uuid

import pytest
from fastapi import HTTPException

from app.api.deps import PaginationParams
from app.api.routes import carecircle as carecircle_routes
from app.api.routes import doctor as doctor_routes
from app.core.security import UserRole
from app.models.carecircle import CareCircleAccess
from app.models.user import User
from app.repositories.health import ChatRepository
from tests.conftest import make_chat_user


def _paging():
    return PaginationParams(limit=50, offset=0)


async def _mother_with_chats(db_session, email):
    mother = await make_chat_user(db_session, email=email)
    await ChatRepository(db_session).create(user_id=mother.id, message="hello", response="hi there", language="en")
    await db_session.commit()
    return mother


async def _user(db_session, email, role):
    user = User(
        email=email, name=email.split("@")[0], password_hash="x", role=role,
        preferred_language="en", is_active=True, is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user


def _doctor_access(mother, doctor, *, chat_history: bool) -> CareCircleAccess:
    return CareCircleAccess(
        user_id=mother.id, requester_id=doctor.id, status="approved",
        share_emergency=True, share_risk_category=True,
        share_wellness_summary=True, share_doctor_notes=False,
        share_chat_history=chat_history,
    )


async def test_caregiver_denied_without_chat_consent(db_session):
    mother = await _mother_with_chats(db_session, "hist-mother@example.com")
    caregiver = await _user(db_session, "hist-care@example.com", UserRole.CAREGIVER)
    access = CareCircleAccess(
        user_id=mother.id, requester_id=caregiver.id, status="approved",
        share_emergency=True, share_risk_category=True,
        share_wellness_summary=True, share_doctor_notes=False,
        share_chat_history=False,
    )
    db_session.add(access)
    await db_session.commit()
    with pytest.raises(HTTPException) as exc:
        await carecircle_routes.get_shared_chat_history(access.id, _paging(), caregiver, db_session)
    assert exc.value.status_code == 403


async def test_caregiver_permitted_with_chat_consent(db_session):
    mother = await _mother_with_chats(db_session, "hist2-mother@example.com")
    await _mother_with_chats(db_session, "hist2-other@example.com")
    caregiver = await _user(db_session, "hist2-care@example.com", UserRole.CAREGIVER)
    access = CareCircleAccess(
        user_id=mother.id, requester_id=caregiver.id, status="approved",
        share_emergency=True, share_risk_category=True,
        share_wellness_summary=True, share_doctor_notes=False,
        share_chat_history=True,
    )
    db_session.add(access)
    await db_session.commit()
    rows = await carecircle_routes.get_shared_chat_history(access.id, _paging(), caregiver, db_session)
    assert len(rows) == 1
    assert rows[0]["message"] == "hello"
    assert all("other" not in r["message"] for r in rows)


async def test_caregiver_stranger_gets_403(db_session):
    mother = await _mother_with_chats(db_session, "hist3-mother@example.com")
    stranger = await _user(db_session, "hist3-stranger@example.com", UserRole.CAREGIVER)
    access = CareCircleAccess(
        user_id=mother.id, requester_id=uuid.uuid4(), status="approved",
        share_emergency=True, share_risk_category=True,
        share_wellness_summary=True, share_doctor_notes=False,
        share_chat_history=True,
    )
    db_session.add(access)
    await db_session.commit()
    with pytest.raises(HTTPException) as exc:
        await carecircle_routes.get_shared_chat_history(access.id, _paging(), stranger, db_session)
    assert exc.value.status_code == 403


async def test_doctor_denied_without_carecircle_access(db_session):
    mother = await _mother_with_chats(db_session, "hist4-mother@example.com")
    doctor = await _user(db_session, "hist4-doc@example.com", UserRole.DOCTOR)
    with pytest.raises(HTTPException) as exc:
        await doctor_routes.get_patient_chat_history(mother.id, _paging(), doctor, db_session)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Patient not found"


async def test_doctor_denied_without_chat_consent(db_session):
    mother = await _mother_with_chats(db_session, "hist6-mother@example.com")
    doctor = await _user(db_session, "hist6-doc@example.com", UserRole.DOCTOR)
    db_session.add(_doctor_access(mother, doctor, chat_history=False))
    await db_session.commit()
    with pytest.raises(HTTPException) as exc:
        await doctor_routes.get_patient_chat_history(mother.id, _paging(), doctor, db_session)
    assert exc.value.status_code == 403
    assert "not consented" in exc.value.detail


async def test_doctor_permitted_with_carecircle_consent(db_session):
    mother = await _mother_with_chats(db_session, "hist5-mother@example.com")
    doctor = await _user(db_session, "hist5-doc@example.com", UserRole.DOCTOR)
    db_session.add(_doctor_access(mother, doctor, chat_history=True))
    await db_session.commit()
    rows = await doctor_routes.get_patient_chat_history(mother.id, _paging(), doctor, db_session)
    assert len(rows) == 1
    assert rows[0]["message"] == "hello"


async def test_doctor_escalation_queue_scoped_to_authorized_patients(db_session):
    from app.models.asha import HighRiskCase
    from app.models.enums import CaseStatus, RiskLevel

    mother_a = await _mother_with_chats(db_session, "qa-mother@example.com")
    mother_b = await _mother_with_chats(db_session, "qb-mother@example.com")
    doctor = await _user(db_session, "q-doc@example.com", UserRole.DOCTOR)
    db_session.add(_doctor_access(mother_a, doctor, chat_history=True))
    for mother in (mother_a, mother_b):
        db_session.add(
            HighRiskCase(
                user_id=mother.id, risk_type="chat_triage",
                risk_level=RiskLevel.HIGH, status=CaseStatus.OPEN,
            )
        )
    await db_session.commit()
    queue = await doctor_routes.list_escalations(doctor, db_session)
    assert [item["mother_id"] for item in queue] == [str(mother_a.id)]
    assert queue[0]["severity"] == "high"
