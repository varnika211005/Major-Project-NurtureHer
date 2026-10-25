from collections.abc import AsyncIterator
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.core.exceptions import AppError
from app.core.security import UserRole, hash_password
from app.main import app
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.enums import RiskLevel
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.schemas.auth import UserCreate
from app.services.auth import AuthService

PASSWORD = "Password123!"


@pytest.fixture
async def doctor_test_client() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            await connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_active "
                    "ON doctor_patients (doctor_id, patient_id) "
                    "WHERE status = 'active' AND deleted_at IS NULL"
                )
            )
        except Exception:
            pass

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


async def create_doctor(
    db: AsyncSession,
    name: str,
    custom_id: str,
    license_num: str,
    *,
    is_active: bool = True,
    is_verified: bool = True,
) -> User:
    doc = User(
        name=name,
        email=f"{name.lower().replace(' ', '.')}@hospital.org",
        password_hash=hash_password(PASSWORD),
        role=UserRole.DOCTOR,
        preferred_language="en",
        is_active=is_active,
        is_verified=is_verified,
        custom_id=custom_id,
        medical_license=license_num,
    )
    db.add(doc)
    await db.flush()
    return doc


async def create_mother(
    db: AsyncSession,
    name: str,
    custom_id: str,
    assigned_doctor_id: str | None = None,
) -> User:
    mother = User(
        name=name,
        email=f"{name.lower().replace(' ', '.')}@example.com",
        password_hash=hash_password(PASSWORD),
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
        is_verified=True,
        custom_id=custom_id,
        assigned_doctor_id=assigned_doctor_id,
    )
    db.add(mother)
    await db.flush()
    db.add(MotherProfile(user_id=mother.id, age=28, blood_group="A+", emergency_contact="9876543210"))
    await db.flush()
    return mother


# 1. One doctor can have multiple patients
@pytest.mark.asyncio
async def test_one_doctor_can_have_multiple_patients(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc = await create_doctor(db, "Dr Multi", "DOC-MULTI1", "MCI-11111")
        pat1 = await create_mother(db, "Patient One", "MTH-P1", "DOC-MULTI1")
        pat2 = await create_mother(db, "Patient Two", "MTH-P2", "DOC-MULTI1")
        db.add(DoctorPatient(doctor_id=doc.id, patient_id=pat1.id, status="active"))
        db.add(DoctorPatient(doctor_id=doc.id, patient_id=pat2.id, status="active"))
        await db.commit()

    current_user["user"] = doc
    roster_res = await client.get("/api/v1/doctor/patients")
    assert roster_res.status_code == 200
    roster = roster_res.json()
    roster_ids = {p["id"] for p in roster}
    assert str(pat1.id) in roster_ids
    assert str(pat2.id) in roster_ids
    assert len(roster) == 2

    # Timeline access for both patients
    t1 = await client.get(f"/api/v1/doctor/patients/{pat1.id}/timeline")
    assert t1.status_code == 200
    t2 = await client.get(f"/api/v1/doctor/patients/{pat2.id}/timeline")
    assert t2.status_code == 200


# 2. One patient can have multiple doctors
@pytest.mark.asyncio
async def test_one_patient_can_have_multiple_doctors(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc_a = await create_doctor(db, "Dr Alpha", "DOC-ALPHA", "MCI-22222")
        doc_b = await create_doctor(db, "Dr Beta", "DOC-BETA", "MCI-33333")
        shared_patient = await create_mother(db, "Shared Mother", "MTH-SHARED", "DOC-ALPHA")
        db.add(DoctorPatient(doctor_id=doc_a.id, patient_id=shared_patient.id, status="active"))
        db.add(DoctorPatient(doctor_id=doc_b.id, patient_id=shared_patient.id, status="active"))
        await db.commit()

    # Doctor Alpha can access
    current_user["user"] = doc_a
    r_a = await client.get("/api/v1/doctor/patients")
    assert any(p["id"] == str(shared_patient.id) for p in r_a.json())
    t_a = await client.get(f"/api/v1/doctor/patients/{shared_patient.id}/timeline")
    assert t_a.status_code == 200

    # Doctor Beta can also access
    current_user["user"] = doc_b
    r_b = await client.get("/api/v1/doctor/patients")
    assert any(p["id"] == str(shared_patient.id) for p in r_b.json())
    t_b = await client.get(f"/api/v1/doctor/patients/{shared_patient.id}/timeline")
    assert t_b.status_code == 200

    # Mother can log in using Doctor Alpha's ID OR Doctor Beta's ID
    async with session_factory() as db:
        auth_service = AuthService(db)
        # Login with Alpha ID
        token_a = await auth_service.login(shared_patient.email, PASSWORD, UserRole.MOTHER, doctor_id="DOC-ALPHA")
        assert token_a.access_token

        # Login with Beta ID
        token_b = await auth_service.login(shared_patient.email, PASSWORD, UserRole.MOTHER, doctor_id="DOC-BETA")
        assert token_b.access_token


# 3. Doctor roster isolation & unassigned patient protection
@pytest.mark.asyncio
async def test_doctor_roster_isolation_and_unassigned_protection(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc_x = await create_doctor(db, "Dr X", "DOC-X", "MCI-44444")
        doc_y = await create_doctor(db, "Dr Y", "DOC-Y", "MCI-55555")
        pat_x = await create_mother(db, "Patient X", "MTH-X", "DOC-X")
        pat_y = await create_mother(db, "Patient Y", "MTH-Y", "DOC-Y")
        db.add(DoctorPatient(doctor_id=doc_x.id, patient_id=pat_x.id, status="active"))
        db.add(DoctorPatient(doctor_id=doc_y.id, patient_id=pat_y.id, status="active"))
        await db.commit()

    current_user["user"] = doc_x
    roster_x = await client.get("/api/v1/doctor/patients")
    assert [p["id"] for p in roster_x.json()] == [str(pat_x.id)]
    # Doc X cannot see Pat Y timeline
    assert (await client.get(f"/api/v1/doctor/patients/{pat_y.id}/timeline")).status_code == 404
    # Doc X cannot add note to Pat Y
    note_res = await client.post(
        f"/api/v1/doctor/patients/{pat_y.id}/notes",
        json={"clinical_observations": "Illegal note attempt"},
    )
    assert note_res.status_code == 404

    current_user["user"] = doc_y
    roster_y = await client.get("/api/v1/doctor/patients")
    assert [p["id"] for p in roster_y.json()] == [str(pat_y.id)]
    assert (await client.get(f"/api/v1/doctor/patients/{pat_x.id}/timeline")).status_code == 404


# 4. Unverified or inactive doctors cannot receive new assignments
@pytest.mark.asyncio
async def test_unverified_and_inactive_doctors_cannot_receive_assignments(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        unverified_doc = await create_doctor(db, "Dr Unverified", "DOC-UNV", "MCI-UNV", is_verified=False)
        _ = await create_doctor(db, "Dr Inactive", "DOC-INA", "MCI-INA", is_active=False)
        _ = await create_doctor(db, "Dr Verified", "DOC-VER", "MCI-VER", is_verified=True, is_active=True)
        patient = await create_mother(db, "Patient Test", "MTH-TST", "DOC-VER")
        await db.commit()

    # Mother registration with unverified doctor rejected
    async with session_factory() as db:
        auth_service = AuthService(db)
        with pytest.raises(AppError) as exc_unv:
            await auth_service.register(
                UserCreate(
                    name="New Mom Unv",
                    email="mom.unv@example.com",
                    password=PASSWORD,
                    confirm_password=PASSWORD,
                    role=UserRole.MOTHER,
                    doctor_id="DOC-UNV",
                )
            )
        assert "pending verification" in exc_unv.value.message

        with pytest.raises(AppError) as exc_ina:
            await auth_service.register(
                UserCreate(
                    name="New Mom Ina",
                    email="mom.ina@example.com",
                    password=PASSWORD,
                    confirm_password=PASSWORD,
                    role=UserRole.MOTHER,
                    doctor_id="DOC-INA",
                )
            )
        assert "inactive" in exc_ina.value.message

    # Assignment endpoint rejects unverified doctor
    current_user["user"] = unverified_doc
    res_assign = await client.post(
        "/api/v1/doctor/patients/assign",
        json={"patient_id": str(patient.id)},
    )
    assert res_assign.status_code == 400
    assert "pending verification" in res_assign.json()["detail"]


# 5. Duplicate active assignments are safely prevented
@pytest.mark.asyncio
async def test_duplicate_active_assignment_prevented(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc = await create_doctor(db, "Dr Assign", "DOC-ASN", "MCI-ASN")
        pat = await create_mother(db, "Patient Assign", "MTH-ASN", "DOC-ASN")
        db.add(DoctorPatient(doctor_id=doc.id, patient_id=pat.id, status="active"))
        await db.commit()

    current_user["user"] = doc
    # Attempting to assign again returns 409 Conflict
    dup_res = await client.post(
        "/api/v1/doctor/patients/assign",
        json={"patient_id": str(pat.id)},
    )
    assert dup_res.status_code == 409
    assert "already actively assigned" in dup_res.json()["detail"]


# 6. Ended assignments no longer grant access
@pytest.mark.asyncio
async def test_ended_assignment_revokes_access_and_login(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc = await create_doctor(db, "Dr Ending", "DOC-END", "MCI-END")
        pat = await create_mother(db, "Patient Ending", "MTH-END", "DOC-END")
        dp = DoctorPatient(doctor_id=doc.id, patient_id=pat.id, status="active")
        db.add(dp)
        await db.commit()

    current_user["user"] = doc
    # Confirm active in roster
    r1 = await client.get("/api/v1/doctor/patients")
    assert any(p["id"] == str(pat.id) for p in r1.json())

    # End care via endpoint
    end_res = await client.post(f"/api/v1/doctor/patients/{pat.id}/end-care")
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # Now patient is removed from roster
    r2 = await client.get("/api/v1/doctor/patients")
    assert not any(p["id"] == str(pat.id) for p in r2.json())

    # Timeline access returns 404
    assert (await client.get(f"/api/v1/doctor/patients/{pat.id}/timeline")).status_code == 404

    # Mother cannot login with ended doctor ID
    async with session_factory() as db:
        auth_service = AuthService(db)
        with pytest.raises(AppError) as exc_login:
            await auth_service.login(pat.email, PASSWORD, UserRole.MOTHER, doctor_id="DOC-END")
        assert "no longer active" in exc_login.value.message


# 7. CareCircle separate consent and granular sharing restrictions
@pytest.mark.asyncio
async def test_carecircle_granular_consent_enforced_with_doctor_assignment(doctor_test_client):
    client, session_factory, current_user = doctor_test_client
    async with session_factory() as db:
        doc = await create_doctor(db, "Dr Consent", "DOC-CNS", "MCI-CNS")
        pat = await create_mother(db, "Patient Consent", "MTH-CNS", "DOC-CNS")
        db.add(DoctorPatient(doctor_id=doc.id, patient_id=pat.id, status="active"))
        # Add clinical data
        db.add(PCOSPrediction(user_id=pat.id, risk_level=RiskLevel.HIGH, probability=0.9, recommendations="Take care"))
        db.add(PPDAssessment(user_id=pat.id, epds_score=18, sentiment="sad", risk_level=RiskLevel.HIGH))
        await db.commit()

    current_user["user"] = doc
    # Doctor has clinical assignment, but NO CareCircle chat history consent
    chat_res = await client.get(f"/api/v1/doctor/patients/{pat.id}/chat-history")
    assert chat_res.status_code == 403
    assert "not consented" in chat_res.json()["detail"]

    # Now add CareCircleAccess with chat sharing granted
    async with session_factory() as db:
        db.add(
            CareCircleAccess(
                user_id=pat.id,
                requester_id=doc.id,
                relationship_label="Primary Doctor",
                status="approved",
                share_emergency=True,
                share_risk_category=True,
                share_wellness_summary=True,
                share_doctor_notes=True,
                share_chat_history=True,
            )
        )
        await db.commit()

    chat_res_ok = await client.get(f"/api/v1/doctor/patients/{pat.id}/chat-history")
    assert chat_res_ok.status_code == 200

    # If CareCircle sharing restrictions hide emergency or risk info, verify they are hidden
    async with session_factory() as db:
        access = await db.scalar(select(CareCircleAccess).where(CareCircleAccess.user_id == pat.id, CareCircleAccess.requester_id == doc.id))
        access.share_emergency = False
        access.share_risk_category = False
        await db.commit()

    roster = (await client.get("/api/v1/doctor/patients")).json()
    pat_entry = [p for p in roster if p["id"] == str(pat.id)][0]
    assert pat_entry["blood_group"] is None
    assert pat_entry["emergency_contact"] is None
    assert pat_entry["latest_pcos_risk"] == "Not shared"
    assert pat_entry["latest_ppd_risk"] == "Not shared"


# 8. Demo accounts and login compatibility preserved
@pytest.mark.asyncio
async def test_demo_accounts_login_preserved(doctor_test_client):
    _, session_factory, _ = doctor_test_client
    async with session_factory() as db:
        # Seed demo-like accounts matching the schema
        demo_doc = await create_doctor(db, "Dr Priya Sharma", "DOC-100001", "MCI-2024-98765")
        demo_doc.email = "doctor@nurtureher.com"
        demo_mother = await create_mother(db, "Ananya Patel", "MTH-100001", "DOC-100001")
        demo_mother.email = "mother@nurtureher.com"
        db.add(DoctorPatient(doctor_id=demo_doc.id, patient_id=demo_mother.id, status="active"))

        demo_caregiver = User(
            name="Rahul Patel",
            email="caregiver@nurtureher.com",
            password_hash=hash_password(PASSWORD),
            role=UserRole.CAREGIVER,
            preferred_language="en",
            is_active=True,
            is_verified=True,
            assigned_mother_id="MTH-100001",
        )
        db.add(demo_caregiver)
        await db.commit()

    async with session_factory() as db:
        auth_service = AuthService(db)
        # Mother demo login
        m_token = await auth_service.login("mother@nurtureher.com", PASSWORD, UserRole.MOTHER, doctor_id="DOC-100001")
        assert m_token.access_token

        # Doctor demo login
        d_token = await auth_service.login("doctor@nurtureher.com", PASSWORD, UserRole.DOCTOR, medical_license="MCI-2024-98765")
        assert d_token.access_token

        # Caregiver demo login
        c_token = await auth_service.login("caregiver@nurtureher.com", PASSWORD, UserRole.CAREGIVER, mother_id="MTH-100001")
        assert c_token.access_token
