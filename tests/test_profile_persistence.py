import pytest
from collections.abc import AsyncIterator
import uuid
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401
from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.core.security import UserRole, hash_password
from app.main import app
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.user import MotherProfile, User
from app.schemas.auth import UserCreate
from app.services.auth import AuthService


PASSWORD = "Password123!"


@pytest.fixture
async def profile_test_client() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    current_user_box: dict[str, User | None] = {"user": None}

    async def override_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    async def override_current_user() -> User:
        user = current_user_box["user"]
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication credentials were not provided")
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, session_factory, current_user_box
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_doctor_profile_persistence(profile_test_client):
    client, session_factory, current_user_box = profile_test_client

    async with session_factory() as session:
        doctor = User(
            id=uuid.uuid4(),
            email="dr.anita@hospital.org",
            name="Dr. Anita Sharma",
            phone="+919876543210",
            age=42,
            password_hash=hash_password(PASSWORD),
            role=UserRole.DOCTOR,
            custom_id="DOC-789012",
            medical_license="KMC-45678",
            is_verified=True,
            is_active=True,
        )
        session.add(doctor)
        await session.commit()
        await session.refresh(doctor)

    current_user_box["user"] = doctor

    # 1. GET Doctor Profile
    res = await client.get("/api/v1/wellness/profile")
    assert res.status_code == 200
    data = res.json()

    assert data["role"] == "doctor"
    assert data["email"] == "dr.anita@hospital.org"
    assert data["name"] == "Dr. Anita Sharma"
    assert data["phone"] == "+919876543210"
    assert data["doctor_id"] == "DOC-789012"
    assert data["medical_license"] == "KMC-45678"
    assert data["is_verified"] is True
    assert data["age"] == 42
    # Ensure sensitive credentials are NOT leaked
    assert "password" not in data
    assert "password_hash" not in data
    # Ensure maternal biometrics are NOT present in doctor profile
    assert "pregnancy_week" not in data
    assert "is_pregnant" not in data
    assert "blood_group" not in data

    # 2. PUT Update Doctor Professional Info
    update_payload = {
        "name": "Dr. Anita Sharma, MD",
        "phone": "+919876543299",
        "specialization": "Obstetrics & High-Risk Pregnancy",
        "qualifications": "MBBS, MD (OB/GYN), FICOG",
        "experience_years": 16,
        "hospital_clinic": "Apollo Cradle Maternity Hospital",
    }
    put_res = await client.put("/api/v1/wellness/profile", json=update_payload)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["name"] == "Dr. Anita Sharma, MD"
    assert put_data["phone"] == "+919876543299"
    assert put_data["specialization"] == "Obstetrics & High-Risk Pregnancy"
    assert put_data["qualifications"] == "MBBS, MD (OB/GYN), FICOG"
    assert put_data["experience_years"] == 16
    assert put_data["hospital_clinic"] == "Apollo Cradle Maternity Hospital"

    # 3. Subsequent GET confirms persistence
    get_res2 = await client.get("/api/v1/wellness/profile")
    assert get_res2.status_code == 200
    data2 = get_res2.json()
    assert data2["name"] == "Dr. Anita Sharma, MD"
    assert data2["phone"] == "+919876543299"
    assert data2["specialization"] == "Obstetrics & High-Risk Pregnancy"
    assert data2["qualifications"] == "MBBS, MD (OB/GYN), FICOG"
    assert data2["experience_years"] == 16
    assert data2["hospital_clinic"] == "Apollo Cradle Maternity Hospital"
    assert data2["doctor_id"] == "DOC-789012"
    assert data2["medical_license"] == "KMC-45678"


@pytest.mark.asyncio
async def test_mother_profile_persistence(profile_test_client):
    client, session_factory, current_user_box = profile_test_client

    async with session_factory() as session:
        # Create doctor first
        doc = User(
            id=uuid.uuid4(),
            email="dr.assigned@hospital.org",
            name="Dr. Assigned",
            password_hash=hash_password(PASSWORD),
            role=UserRole.DOCTOR,
            custom_id="DOC-111222",
            medical_license="MCI-111222",
            is_verified=True,
            is_active=True,
        )
        session.add(doc)

        # Create mother
        mother = User(
            id=uuid.uuid4(),
            email="priya.sharma@example.com",
            name="Priya Sharma",
            phone="+919811122233",
            age=27,
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            custom_id="MTH-334455",
            assigned_doctor_id="DOC-111222",
            is_verified=True,
            is_active=True,
        )
        session.add(mother)
        await session.flush()

        # Link doctor to mother in doctor_patients
        assoc = DoctorPatient(
            doctor_id=doc.id,
            patient_id=mother.id,
            status="active",
        )
        session.add(assoc)

        # Create initial mother profile
        m_prof = MotherProfile(
            user_id=mother.id,
            pregnancy_status="Pregnant (Trimester 2)",
            blood_group="B+",
            district="Bangalore Urban",
            village="Indiranagar",
        )
        session.add(m_prof)
        await session.commit()
        await session.refresh(mother)

    current_user_box["user"] = mother

    # 1. GET Mother Profile
    res = await client.get("/api/v1/wellness/profile")
    assert res.status_code == 200
    data = res.json()

    assert data["role"] == "mother"
    assert data["email"] == "priya.sharma@example.com"
    assert data["name"] == "Priya Sharma"
    assert data["phone"] == "+919811122233"
    assert data["mother_id"] == "MTH-334455"
    assert data["age"] == 27
    assert data["pregnancy_status"] == "Pregnant (Trimester 2)"
    assert data["blood_group"] == "B+"
    assert data["district"] == "Bangalore Urban"
    assert data["village"] == "Indiranagar"
    assert len(data["assigned_doctors"]) == 1
    assert data["assigned_doctors"][0]["name"] == "Dr. Assigned"
    assert data["assigned_doctors"][0]["custom_id"] == "DOC-111222"

    # Ensure sensitive credentials are NOT leaked
    assert "password" not in data
    assert "password_hash" not in data

    # 2. PUT Update Mother Profile
    update_payload = {
        "name": "Priya Rajesh Sharma",
        "phone": "+919811122299",
        "pregnancy_status": "Third Trimester",
        "emergency_contact": "+919811122288",
        "village": "Koramangala 4th Block",
    }
    put_res = await client.put("/api/v1/wellness/profile", json=update_payload)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["name"] == "Priya Rajesh Sharma"
    assert put_data["phone"] == "+919811122299"
    assert put_data["pregnancy_status"] == "Third Trimester"
    assert put_data["emergency_contact"] == "+919811122288"
    assert put_data["village"] == "Koramangala 4th Block"
    # Unchanged fields should not be wiped
    assert put_data["blood_group"] == "B+"
    assert put_data["district"] == "Bangalore Urban"

    # 3. Subsequent GET confirms persistence
    get_res2 = await client.get("/api/v1/wellness/profile")
    assert get_res2.status_code == 200
    data2 = get_res2.json()
    assert data2["name"] == "Priya Rajesh Sharma"
    assert data2["pregnancy_status"] == "Third Trimester"
    assert data2["emergency_contact"] == "+919811122288"


@pytest.mark.asyncio
async def test_caregiver_profile_persistence(profile_test_client):
    client, session_factory, current_user_box = profile_test_client

    async with session_factory() as session:
        # Create mother
        mother = User(
            id=uuid.uuid4(),
            email="mother.care@example.com",
            name="Sunita Rao",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            custom_id="MTH-888999",
            is_verified=True,
            is_active=True,
        )
        session.add(mother)
        await session.flush()

        # Create caregiver
        caregiver = User(
            id=uuid.uuid4(),
            email="caregiver.ramesh@example.com",
            name="Ramesh Rao",
            phone="+919800011122",
            password_hash=hash_password(PASSWORD),
            role=UserRole.CAREGIVER,
            custom_id="CRG-555666",
            assigned_mother_id="MTH-888999",
            relationship_label="Husband",
            is_verified=True,
            is_active=True,
        )
        session.add(caregiver)
        await session.flush()

        # Add CareCircleAccess record
        access = CareCircleAccess(
            user_id=mother.id,
            requester_id=caregiver.id,
            status="active",
            relationship_label="Husband",
        )
        session.add(access)
        await session.commit()
        await session.refresh(caregiver)

    current_user_box["user"] = caregiver

    # 1. GET Caregiver Profile
    res = await client.get("/api/v1/wellness/profile")
    assert res.status_code == 200
    data = res.json()

    assert data["role"] == "caregiver"
    assert data["email"] == "caregiver.ramesh@example.com"
    assert data["name"] == "Ramesh Rao"
    assert data["phone"] == "+919800011122"
    assert data["caregiver_id"] == "CRG-555666"
    assert data["assigned_mother_id"] == "MTH-888999"
    assert data["relationship_label"] == "Husband"
    assert data["caregiver_status"] == "active"
    assert data["linked_mother"]["name"] == "Sunita Rao"
    assert data["linked_mother"]["custom_id"] == "MTH-888999"

    # Ensure sensitive credentials are NOT leaked
    assert "password" not in data
    assert "password_hash" not in data
    # Ensure doctor/mother fields are not present
    assert "medical_license" not in data
    assert "pregnancy_week" not in data

    # 2. PUT Update Caregiver Profile
    update_payload = {
        "name": "Ramesh Kumar Rao",
        "phone": "+919800011199",
        "relationship_label": "Primary Caregiver / Spouse",
    }
    put_res = await client.put("/api/v1/wellness/profile", json=update_payload)
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["name"] == "Ramesh Kumar Rao"
    assert put_data["phone"] == "+919800011199"
    assert put_data["relationship_label"] == "Primary Caregiver / Spouse"

    # 3. Subsequent GET confirms persistence
    get_res2 = await client.get("/api/v1/wellness/profile")
    assert get_res2.status_code == 200
    data2 = get_res2.json()
    assert data2["name"] == "Ramesh Kumar Rao"
    assert data2["phone"] == "+919800011199"
    assert data2["relationship_label"] == "Primary Caregiver / Spouse"
    assert data2["caregiver_id"] == "CRG-555666"


@pytest.mark.asyncio
async def test_profile_isolation(profile_test_client):
    client, session_factory, current_user_box = profile_test_client

    async with session_factory() as session:
        user_a = User(
            id=uuid.uuid4(),
            email="user.a@example.com",
            name="User Alpha",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            custom_id="MTH-AAAAAA",
            is_verified=True,
            is_active=True,
        )
        user_b = User(
            id=uuid.uuid4(),
            email="user.b@example.com",
            name="User Beta",
            password_hash=hash_password(PASSWORD),
            role=UserRole.MOTHER,
            custom_id="MTH-BBBBBB",
            is_verified=True,
            is_active=True,
        )
        session.add_all([user_a, user_b])
        await session.commit()
        await session.refresh(user_a)
        await session.refresh(user_b)

    # When user_a is authenticated, profile endpoint returns ONLY user_a
    current_user_box["user"] = user_a
    res_a = await client.get("/api/v1/wellness/profile")
    assert res_a.status_code == 200
    assert res_a.json()["email"] == "user.a@example.com"
    assert res_a.json()["mother_id"] == "MTH-AAAAAA"

    # When user_b is authenticated, profile endpoint returns ONLY user_b
    current_user_box["user"] = user_b
    res_b = await client.get("/api/v1/wellness/profile")
    assert res_b.status_code == 200
    assert res_b.json()["email"] == "user.b@example.com"
    assert res_b.json()["mother_id"] == "MTH-BBBBBB"
