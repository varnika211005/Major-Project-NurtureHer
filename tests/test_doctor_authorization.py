from collections.abc import AsyncIterator
import app.models  # noqa: F401
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.core.security import UserRole
from app.main import app
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorNote
from app.models.enums import MoodOption, RiskLevel
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom


@pytest.fixture
async def doctor_api() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    current_user: dict[str, User | None] = {"user": None}

    async def override_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    async def override_current_user() -> User:
        user = current_user["user"]
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication credentials were not provided")
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_current_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client, session_factory, current_user
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
        await engine.dispose()


async def create_user(db: AsyncSession, role: UserRole, name: str) -> User:
    user = User(
        name=name,
        email=f"{name.lower().replace(' ', '.')}@example.com",
        password_hash="test-hash",
        role=role,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


async def create_doctor_pair(session_factory: async_sessionmaker[AsyncSession]):
    async with session_factory() as db:
        doctor_a = await create_user(db, UserRole.DOCTOR, "Doctor A")
        doctor_b = await create_user(db, UserRole.DOCTOR, "Doctor B")
        patient_a = await create_user(db, UserRole.MOTHER, "Patient A")
        patient_b = await create_user(db, UserRole.MOTHER, "Patient B")
        access_a = CareCircleAccess(
            user_id=patient_a.id,
            requester_id=doctor_a.id,
            relationship_label="Consulting Doctor",
            status="approved",
            share_emergency=True,
            share_risk_category=True,
            share_wellness_summary=True,
            share_doctor_notes=False,
        )
        access_b = CareCircleAccess(
            user_id=patient_b.id,
            requester_id=doctor_b.id,
            relationship_label="Consulting Doctor",
            status="approved",
            share_emergency=True,
            share_risk_category=True,
            share_wellness_summary=True,
            share_doctor_notes=False,
        )
        db.add_all([access_a, access_b])
        await db.commit()
        return doctor_a, doctor_b, patient_a, patient_b, access_a, access_b


@pytest.mark.asyncio
async def test_authorized_doctor_can_access_patient_and_roster_is_scoped(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, _, patient_a, patient_b, _, _ = await create_doctor_pair(session_factory)
    current_user["user"] = doctor_a

    roster = await client.get("/api/v1/doctor/patients")
    assert roster.status_code == 200
    assert [patient["id"] for patient in roster.json()] == [str(patient_a.id)]

    timeline = await client.get(f"/api/v1/doctor/patients/{patient_a.id}/timeline")
    assert timeline.status_code == 200
    assert timeline.json()["patient"]["id"] == str(patient_a.id)
    assert str(patient_b.id) not in {patient["id"] for patient in roster.json()}


@pytest.mark.asyncio
async def test_doctor_cannot_access_unassigned_or_another_doctors_patient(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, _, _, patient_b, _, _ = await create_doctor_pair(session_factory)
    current_user["user"] = doctor_a

    assert (await client.get(f"/api/v1/doctor/patients/{patient_b.id}/timeline")).status_code == 404


@pytest.mark.asyncio
async def test_revoked_relationship_denies_roster_timeline_and_note_creation(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, _, patient_a, _, access_a, _ = await create_doctor_pair(session_factory)
    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_a.id)
        access.status = "revoked"
        access.revoked_at = access.requested_at
        await db.commit()

    current_user["user"] = doctor_a
    assert (await client.get("/api/v1/doctor/patients")).json() == []
    assert (await client.get(f"/api/v1/doctor/patients/{patient_a.id}/timeline")).status_code == 404
    note_response = await client.post(
        f"/api/v1/doctor/patients/{patient_a.id}/notes",
        json={"clinical_observations": "Follow-up"},
    )
    assert note_response.status_code == 404

    async with session_factory() as db:
        note_count = await db.scalar(select(func.count()).select_from(DoctorNote))
    assert note_count == 0


@pytest.mark.asyncio
async def test_unauthorized_note_creation_and_changed_patient_id_are_rejected(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, _, patient_a, patient_b, _, _ = await create_doctor_pair(session_factory)
    current_user["user"] = doctor_a

    response = await client.post(
        f"/api/v1/doctor/patients/{patient_b.id}/notes",
        json={"clinical_observations": "Unauthorized note"},
    )
    assert response.status_code == 404
    assert (await client.get(f"/api/v1/doctor/patients/{patient_b.id}/timeline")).status_code == 404

    async with session_factory() as db:
        note_count = await db.scalar(select(func.count()).select_from(DoctorNote))
    assert note_count == 0

    authorized_note = await client.post(
        f"/api/v1/doctor/patients/{patient_a.id}/notes",
        json={"clinical_observations": "Authorized note"},
    )
    assert authorized_note.status_code == 200
    assert authorized_note.json()["patient_id"] == str(patient_a.id)


@pytest.mark.asyncio
async def test_doctor_cannot_read_other_doctors_notes_without_patient_consent(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, doctor_b, patient_a, _, _, _ = await create_doctor_pair(session_factory)
    async with session_factory() as db:
        db.add_all(
            [
                DoctorNote(doctor_id=doctor_a.id, patient_id=patient_a.id, clinical_observations="Doctor A note"),
                DoctorNote(doctor_id=doctor_b.id, patient_id=patient_a.id, clinical_observations="Doctor B note"),
            ]
        )
        await db.commit()

    current_user["user"] = doctor_a
    timeline = await client.get(f"/api/v1/doctor/patients/{patient_a.id}/timeline")
    assert timeline.status_code == 200
    assert [note["clinical_observations"] for note in timeline.json()["doctor_notes"]] == ["Doctor A note"]


@pytest.mark.asyncio
async def test_doctor_consent_scopes_limit_timeline_and_roster_fields(doctor_api):
    client, session_factory, current_user = doctor_api
    doctor_a, _, patient_a, _, access_a, _ = await create_doctor_pair(session_factory)
    async with session_factory() as db:
        db.add_all(
            [
                MotherProfile(user_id=patient_a.id, age=30, blood_group="O+", emergency_contact="555-0100"),
                Mood(user_id=patient_a.id, mood=MoodOption.SAD, note="Private mood note"),
                Symptom(user_id=patient_a.id, fatigue=True, headache=True, sleep_issue=True, anxiety=True, cramps=True),
                PCOSPrediction(user_id=patient_a.id, risk_level=RiskLevel.HIGH, probability=0.95, recommendations="Private recommendation"),
                PPDAssessment(user_id=patient_a.id, epds_score=20, sentiment="negative", risk_level=RiskLevel.HIGH),
            ]
        )
        await db.commit()

    current_user["user"] = doctor_a
    shared_timeline = await client.get(f"/api/v1/doctor/patients/{patient_a.id}/timeline")
    assert shared_timeline.status_code == 200
    shared_body = shared_timeline.json()
    assert shared_body["moods"][0]["note"] is None
    assert set(shared_body["symptoms"][0]) == {"id", "fatigue", "sleep_issue", "anxiety", "created_at"}
    assert shared_body["pcos_screenings"][0]["risk_level"] == "high"
    assert "probability" not in shared_body["pcos_screenings"][0]
    assert "recommendations" not in shared_body["pcos_screenings"][0]
    assert shared_body["ppd_screenings"][0]["risk_level"] == "high"
    assert "epds_score" not in shared_body["ppd_screenings"][0]
    assert "sentiment" not in shared_body["ppd_screenings"][0]

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_a.id)
        access.share_emergency = False
        access.share_risk_category = False
        access.share_wellness_summary = False
        await db.commit()

    roster = await client.get("/api/v1/doctor/patients")
    patient_row = roster.json()[0]
    assert patient_row["latest_pcos_risk"] == "Not shared"
    assert patient_row["latest_ppd_risk"] == "Not shared"
    assert patient_row["blood_group"] is None
    assert patient_row["emergency_contact"] is None

    timeline = await client.get(f"/api/v1/doctor/patients/{patient_a.id}/timeline")
    assert timeline.status_code == 200
    body = timeline.json()
    assert body["moods"] == []
    assert body["symptoms"] == []
    assert body["pcos_screenings"] == []
    assert body["ppd_screenings"] == []
    assert body["cycles"] == []
    assert body["patient"]["blood_group"] is None
    assert body["patient"]["emergency_contact"] is None


@pytest.mark.asyncio
async def test_authentication_role_and_admin_access_policy(doctor_api):
    client, session_factory, current_user = doctor_api
    _, _, patient_a, patient_b, _, _ = await create_doctor_pair(session_factory)

    unauthenticated = await client.get("/api/v1/doctor/patients")
    assert unauthenticated.status_code == 401

    mother = User(
        name="Mother User",
        email="mother.user@example.com",
        password_hash="test-hash",
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    async with session_factory() as db:
        db.add(mother)
        await db.commit()
    current_user["user"] = mother
    assert (await client.get("/api/v1/doctor/patients")).status_code == 403

    admin = User(
        name="Admin User",
        email="admin.user@example.com",
        password_hash="test-hash",
        role=UserRole.ADMIN,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    current_user["user"] = admin
    roster = await client.get("/api/v1/doctor/patients")
    assert roster.status_code == 200
    assert {row["id"] for row in roster.json()} == {str(patient_a.id), str(patient_b.id), str(mother.id)}
    assert (await client.get(f"/api/v1/doctor/patients/{patient_b.id}/timeline")).status_code == 200
