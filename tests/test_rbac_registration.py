import json

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

import app.models  # noqa: F401 - register all models
from app.api.deps import get_current_user
from app.api.routes import admin as admin_routes
from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import UserRole
from app.main import app
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.auth import AdminUserUpdate, UserCreate
from app.services.auth import AuthService


from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.user import MotherProfile


async def ensure_test_doctor(db) -> User:
    doc = await db.scalar(select(User).where(User.email == "test-doctor-fixture@example.com"))
    if not doc:
        doc = User(
            email="test-doctor-fixture@example.com",
            name="Dr. Fixture",
            password_hash="hash",
            role=UserRole.DOCTOR,
            custom_id="DOC-999999",
            medical_license="MCI-999999",
            is_verified=True,
            is_active=True,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
    return doc


async def ensure_test_mother(db) -> User:
    mth = await db.scalar(select(User).where(User.email == "test-mother-fixture@example.com"))
    if not mth:
        mth = User(
            email="test-mother-fixture@example.com",
            name="Mother Fixture",
            password_hash="hash",
            role=UserRole.MOTHER,
            custom_id="MTH-999999",
            is_verified=True,
            is_active=True,
        )
        db.add(mth)
        await db.commit()
        await db.refresh(mth)
    return mth


@pytest.mark.asyncio
async def test_public_registration_rejects_admin(db_session):
    payload = UserCreate(
        email="rbac-admin-self@example.com",
        name="Admin User",
        password="Password123!",
        role=UserRole.ADMIN,
    )
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).register(payload)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_password_confirmation_mismatch(db_session):
    payload = UserCreate(
        email="mismatch@example.com",
        name="Mismatch User",
        password="Password123!",
        confirm_password="Different123!",
        role=UserRole.MOTHER,
        doctor_id="DOC-999999",
    )
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).register(payload)
    assert exc_info.value.status_code == 400
    assert "Passwords do not match" in exc_info.value.message


@pytest.mark.asyncio
async def test_doctor_registration_flow_and_duplicate_license(db_session):
    # Missing license
    missing_lic = UserCreate(
        email="dr-missing@example.com",
        name="Dr. Missing",
        password="Password123!",
        role=UserRole.DOCTOR,
    )
    with pytest.raises(AppError) as exc_missing:
        await AuthService(db_session).register(missing_lic)
    assert exc_missing.value.status_code == 400

    # Successful doctor registration
    valid_doc = UserCreate(
        email="dr-new@example.com",
        name="Dr. Newbie",
        password="Password123!",
        confirm_password="Password123!",
        role=UserRole.DOCTOR,
        medical_license="MCI-123456",
        age=38,
    )
    doc_user = await AuthService(db_session).register(valid_doc)
    assert doc_user.role == UserRole.DOCTOR
    assert doc_user.custom_id.startswith("DOC-")
    assert doc_user.medical_license == "MCI-123456"
    assert doc_user.is_verified is False  # Must remain unverified until approved

    # Duplicate license rejection
    dup_doc = UserCreate(
        email="dr-duplicate@example.com",
        name="Dr. Duplicate",
        password="Password123!",
        confirm_password="Password123!",
        role=UserRole.DOCTOR,
        medical_license="mci-123456",  # case-insensitive match
    )
    with pytest.raises(AppError) as exc_dup:
        await AuthService(db_session).register(dup_doc)
    assert exc_dup.value.status_code == 409
    assert "already registered" in exc_dup.value.message


@pytest.mark.asyncio
async def test_mother_registration_flow_and_invalid_doctor(db_session):
    # Invalid doctor
    invalid_doc = UserCreate(
        email="mother-bad-doc@example.com",
        name="Mother Invalid Doc",
        password="Password123!",
        role=UserRole.MOTHER,
        doctor_id="DOC-DOES-NOT-EXIST",
    )
    with pytest.raises(AppError) as exc_doc:
        await AuthService(db_session).register(invalid_doc)
    assert exc_doc.value.status_code == 400

    # Valid doctor
    doctor = await ensure_test_doctor(db_session)
    valid_mother = UserCreate(
        email="mother-valid@example.com",
        name="Mother Valid",
        password="Password123!",
        confirm_password="Password123!",
        role=UserRole.MOTHER,
        doctor_id=doctor.custom_id,
        age=29,
    )
    mother_user = await AuthService(db_session).register(valid_mother)
    assert mother_user.role == UserRole.MOTHER
    assert mother_user.custom_id.startswith("MTH-")
    assert mother_user.assigned_doctor_id == doctor.custom_id

    # Check MotherProfile and DoctorPatient creation
    profile = await db_session.scalar(select(MotherProfile).where(MotherProfile.user_id == mother_user.id))
    assert profile is not None
    assert profile.age == 29
    dp_link = await db_session.scalar(select(DoctorPatient).where(DoctorPatient.patient_id == mother_user.id))
    assert dp_link is not None
    assert dp_link.doctor_id == doctor.id
    assert dp_link.status == "active"


@pytest.mark.asyncio
async def test_caregiver_registration_flow_and_consent_pending(db_session):
    # Invalid mother ID
    invalid_mth = UserCreate(
        email="caregiver-bad@example.com",
        name="Caregiver Bad",
        password="Password123!",
        role=UserRole.CAREGIVER,
        mother_id="MTH-NON-EXISTENT",
    )
    with pytest.raises(AppError) as exc_mth:
        await AuthService(db_session).register(invalid_mth)
    assert exc_mth.value.status_code == 400

    # Valid mother
    mother = await ensure_test_mother(db_session)
    valid_cg = UserCreate(
        email="caregiver-valid@example.com",
        name="Caregiver Valid",
        password="Password123!",
        confirm_password="Password123!",
        role=UserRole.CAREGIVER,
        mother_id=mother.custom_id,
    )
    cg_user = await AuthService(db_session).register(valid_cg)
    assert cg_user.role == UserRole.CAREGIVER
    assert cg_user.custom_id.startswith("CRG-")
    assert cg_user.assigned_mother_id == mother.custom_id

    # Verify CareCircleAccess is created with status pending (consent not granted yet)
    access = await db_session.scalar(select(CareCircleAccess).where(CareCircleAccess.requester_id == cg_user.id))
    assert access is not None
    assert access.user_id == mother.id
    assert access.status == "pending"


@pytest.mark.asyncio
async def test_mother_cannot_access_admin_dashboard(db_session):
    doctor = await ensure_test_doctor(db_session)
    mother = await AuthService(db_session).register(
        UserCreate(
            email="mother-guard@example.com",
            name="Mother Guard",
            password="Password123!",
            role=UserRole.MOTHER,
            doctor_id=doctor.custom_id,
        )
    )

    async def override_db():
        yield db_session

    async def override_current_user() -> User:
        return mother

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_current_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/admin/dashboard")
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_update_is_audited_without_field_values(db_session):
    admin = User(
        name="Admin",
        email="rbac-admin@example.com",
        password_hash="hash",
        role=UserRole.ADMIN,
        preferred_language="en",
        is_active=True,
    )
    target = User(
        name="Target",
        email="rbac-target@example.com",
        password_hash="hash",
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
    )
    db_session.add_all([admin, target])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(target)

    updated = await admin_routes.update_user(
        target.id,
        AdminUserUpdate(role=UserRole.DOCTOR, is_active=False),
        admin=admin,
        db=db_session,
    )

    assert updated.role == UserRole.DOCTOR
    assert updated.is_active is False
    log = await db_session.scalar(select(AuditLog))
    assert log is not None
    assert log.user_id == admin.id
    assert log.action == "admin.user.update"
    assert log.resource == f"user:{target.id}"
    assert json.loads(log.metadata_json) == {"fields": ["is_active", "role"]}
    assert "doctor" not in (log.metadata_json or "")
