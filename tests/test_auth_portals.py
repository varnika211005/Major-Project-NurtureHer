import pytest
from fastapi.security import HTTPAuthorizationCredentials
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_current_user as resolve_current_user
from app.core.exceptions import AppError
from app.core.security import UserRole, create_access_token, hash_password
from app.main import app
from app.models.user import User
from app.services.auth import AuthService
from app.services.token_service import TokenService

PASSWORD = "Password123!"


async def create_user(
    db,
    email: str,
    role: UserRole,
    *,
    is_verified: bool = True,
    is_active: bool = True,
    custom_id: str | None = None,
    medical_license: str | None = None,
    assigned_doctor_id: str | None = None,
    assigned_mother_id: str | None = None,
) -> User:
    user = User(
        email=email,
        name=f"{role.value.title()} User",
        password_hash=hash_password(PASSWORD),
        role=role,
        preferred_language="en",
        is_verified=is_verified,
        is_active=is_active,
        custom_id=custom_id,
        medical_license=medical_license,
        assigned_doctor_id=assigned_doctor_id,
        assigned_mother_id=assigned_mother_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_portal_must_match_account_role(db_session):
    admin = await create_user(db_session, "portal-admin@example.com", UserRole.ADMIN)

    with pytest.raises(AppError) as wrong_portal:
        await AuthService(db_session).login(admin.email, PASSWORD, UserRole.MOTHER)

    assert wrong_portal.value.status_code == 403
    assert "selected portal" in wrong_portal.value.message

    tokens = await AuthService(db_session).login(admin.email, PASSWORD, UserRole.ADMIN)
    assert tokens.access_token
    assert tokens.refresh_token


@pytest.mark.asyncio
async def test_admin_login_endpoint_rejects_non_admin_and_accepts_admin(db_session):
    mother = await create_user(db_session, "portal-mother@example.com", UserRole.MOTHER)
    admin = await create_user(db_session, "portal-admin-api@example.com", UserRole.ADMIN)

    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides.pop(get_current_user, None)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            rejected = await client.post(
                "/api/v1/auth/admin/login",
                json={"email": mother.email, "password": PASSWORD},
            )
            accepted = await client.post(
                "/api/v1/auth/admin/login",
                json={"email": admin.email, "password": PASSWORD},
            )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert rejected.status_code == 403
    assert accepted.status_code == 200
    assert accepted.json()["access_token"]


@pytest.mark.asyncio
async def test_unverified_doctor_cannot_login_or_refresh_until_verified(db_session, monkeypatch):
    doctor = await create_user(
        db_session,
        "pending-doctor@example.com",
        UserRole.DOCTOR,
        is_verified=False,
    )

    with pytest.raises(AppError) as pending:
        await AuthService(db_session).login(doctor.email, PASSWORD, UserRole.DOCTOR)
    assert pending.value.status_code == 403
    assert "pending verification" in pending.value.message

    doctor.is_verified = True
    await db_session.commit()
    tokens = await AuthService(db_session).login(doctor.email, PASSWORD, UserRole.DOCTOR)

    async def rotate_refresh_token(self, _: str):
        return str(doctor.id), {}

    monkeypatch.setattr(TokenService, "rotate_refresh_token", rotate_refresh_token)
    doctor.is_verified = False
    await db_session.commit()
    with pytest.raises(AppError) as revoked:
        await AuthService(db_session).refresh(tokens.refresh_token)
    assert revoked.value.status_code == 403
    assert "pending verification" in revoked.value.message


@pytest.mark.asyncio
async def test_unverified_doctor_access_token_is_rejected(db_session):
    doctor = await create_user(
        db_session,
        "pending-doctor-access@example.com",
        UserRole.DOCTOR,
        is_verified=False,
    )
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=create_access_token(doctor.id),
    )

    with pytest.raises(AppError) as pending:
        await resolve_current_user(credentials=credentials, db=db_session)

    assert pending.value.status_code == 403
    assert "pending verification" in pending.value.message


@pytest.mark.asyncio
async def test_mother_login_identifier_validation(db_session):
    mother = await create_user(
        db_session,
        "mth-test-login@example.com",
        UserRole.MOTHER,
        custom_id="MTH-111111",
        assigned_doctor_id="DOC-777777",
    )
    # Missing doctor ID
    with pytest.raises(AppError) as missing_doc:
        await AuthService(db_session).login(mother.email, PASSWORD, UserRole.MOTHER)
    assert missing_doc.value.status_code == 400
    assert "Doctor ID is required" in missing_doc.value.message

    # Wrong doctor ID
    with pytest.raises(AppError) as wrong_doc:
        await AuthService(db_session).login(mother.email, PASSWORD, UserRole.MOTHER, doctor_id="DOC-WRONG")
    assert wrong_doc.value.status_code == 401
    assert "Invalid Doctor ID" in wrong_doc.value.message

    # Correct doctor ID
    tokens = await AuthService(db_session).login(mother.email, PASSWORD, UserRole.MOTHER, doctor_id="DOC-777777")
    assert tokens.access_token


@pytest.mark.asyncio
async def test_doctor_login_identifier_validation(db_session):
    doctor = await create_user(
        db_session,
        "doc-test-login@example.com",
        UserRole.DOCTOR,
        custom_id="DOC-888888",
        medical_license="MCI-888888",
        is_verified=True,
    )
    # Missing license
    with pytest.raises(AppError) as missing_lic:
        await AuthService(db_session).login(doctor.email, PASSWORD, UserRole.DOCTOR)
    assert missing_lic.value.status_code == 400
    assert "Medical license" in missing_lic.value.message

    # Wrong license
    with pytest.raises(AppError) as wrong_lic:
        await AuthService(db_session).login(doctor.email, PASSWORD, UserRole.DOCTOR, medical_license="MCI-WRONG")
    assert wrong_lic.value.status_code == 401
    assert "Invalid Medical License" in wrong_lic.value.message

    # Correct license
    tokens = await AuthService(db_session).login(doctor.email, PASSWORD, UserRole.DOCTOR, medical_license="mci-888888")
    assert tokens.access_token


@pytest.mark.asyncio
async def test_caregiver_login_identifier_validation(db_session):
    caregiver = await create_user(
        db_session,
        "cg-test-login@example.com",
        UserRole.CAREGIVER,
        custom_id="CRG-555555",
        assigned_mother_id="MTH-555555",
    )
    # Missing mother ID
    with pytest.raises(AppError) as missing_mth:
        await AuthService(db_session).login(caregiver.email, PASSWORD, UserRole.CAREGIVER)
    assert missing_mth.value.status_code == 400
    assert "Mother/Patient ID is required" in missing_mth.value.message

    # Wrong mother ID
    with pytest.raises(AppError) as wrong_mth:
        await AuthService(db_session).login(caregiver.email, PASSWORD, UserRole.CAREGIVER, mother_id="MTH-WRONG")
    assert wrong_mth.value.status_code == 401
    assert "Invalid Mother/Patient ID" in wrong_mth.value.message

    # Correct mother ID
    tokens = await AuthService(db_session).login(caregiver.email, PASSWORD, UserRole.CAREGIVER, mother_id="MTH-555555")
    assert tokens.access_token
