"""Regression tests for ASHA Worker role removal.

The four supported roles are mother, doctor, caregiver, and admin.
High-risk case creation must work without any worker assignment, and
existing asha_worker rows must be deactivated (never deleted) by migration
0003 because the enum member no longer exists. Legacy rows must fail
authentication with the same non-leaking errors as inactive or unknown
accounts, never with a 500 LookupError.
"""

from datetime import timedelta
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base
from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.core.redis import redis_client
from app.core.security import (
    UserRole,
    create_access_token,
    create_refresh_token,
    create_token,
    hash_password,
    is_legacy_role_lookup_error,
)
from app.main import app
from app.models.asha import HighRiskCase
from app.models.enums import RiskLevel
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.auth import UserCreate
from app.services.auth import AuthService
from app.services.risk_engine import HighRiskEngine


def test_supported_roles_are_exactly_four():
    assert sorted(r.value for r in UserRole) == ["admin", "caregiver", "doctor", "mother"]


def test_register_rejects_removed_asha_role():
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "x@example.com", "name": "X Y", "password": "Password123!", "role": "asha_worker"},
    )
    assert response.status_code == 422


def test_removed_asha_routes_return_404():
    client = TestClient(app)
    for path in ["/api/v1/asha/high-risk", "/api/v1/asha/alerts", "/api/v1/asha/statistics"]:
        assert client.get(path).status_code == 404


def test_legacy_asha_worker_value_no_longer_valid():
    # Documents why migration 0003 must deactivate legacy rows first:
    # SQLAlchemy can no longer load role='asha_worker' rows into UserRole.
    with pytest.raises(ValueError):
        UserRole("asha_worker")


async def test_high_risk_case_created_unassigned_without_workers():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as db:
            user = User(
                email="m@example.com",
                name="M T",
                password_hash="x",
                role=UserRole.MOTHER,
                preferred_language="en",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            created = await HighRiskEngine(db).evaluate(user, "pcos", RiskLevel.HIGH)
            assert created is True
            case = await db.scalar(select(HighRiskCase).where(HighRiskCase.user_id == user.id))
            assert case is not None
            assert case.assigned_worker_id is None
    finally:
        await engine.dispose()


async def _make_legacy_user(db, email: str, password: str = "Password123!") -> User:
    """Create a user, then flip their role to the removed ASHA_WORKER value.

    Inserted as MOTHER through the model's enum, flipped by raw SQL (SQLite's
    role column is plain VARCHAR, no CHECK constraint), then expunged so the
    next load must hit the database and run the enum conversion.
    """
    user = User(
        email=email,
        name="Legacy User",
        password_hash=hash_password(password),
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.execute(
        sa.text("UPDATE users SET role = 'ASHA_WORKER' WHERE email = :email"),
        {"email": email},
    )
    await db.commit()
    db.expunge_all()
    return user


async def test_login_with_legacy_role_row_returns_invalid_credentials(db_session):
    await _make_legacy_user(db_session, "legacy-login@example.com")
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).login("legacy-login@example.com", "Password123!")
    assert exc_info.value.status_code == 401
    assert exc_info.value.message == "Invalid credentials"


async def test_get_current_user_with_legacy_role_row_returns_401(db_session):
    user = await _make_legacy_user(db_session, "legacy-bearer@example.com")
    token = create_access_token(user.id)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(AppError) as exc_info:
        await get_current_user(credentials, db_session)
    assert exc_info.value.status_code == 401
    assert exc_info.value.message == "Inactive or missing user"


async def test_register_with_legacy_email_returns_conflict(db_session):
    await _make_legacy_user(db_session, "legacy-taken@example.com")
    payload = UserCreate(email="legacy-taken@example.com", name="New User", password="Password123!")
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).register(payload)
    assert exc_info.value.status_code == 409
    assert exc_info.value.message == "Email already registered"


async def test_forgot_password_with_legacy_email_is_silent(db_session):
    await _make_legacy_user(db_session, "legacy-forgot@example.com")
    result = await AuthService(db_session).forgot_password("legacy-forgot@example.com")
    assert result is None


async def test_refresh_with_legacy_user_returns_not_found(db_session, monkeypatch):
    user = await _make_legacy_user(db_session, "legacy-refresh@example.com")
    refresh_token = create_refresh_token(user.id, str(uuid4()))

    async def _fake_redis_get(name):
        return str(user.id)

    # Redis is unreachable from the test host; stub only the lookup so the
    # refresh rotation reaches the user load under test.
    monkeypatch.setattr(redis_client, "get", _fake_redis_get)
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).refresh(refresh_token)
    assert exc_info.value.status_code == 404
    assert exc_info.value.message == "User not found"


async def test_reset_password_with_legacy_user_returns_not_found(db_session):
    user = await _make_legacy_user(db_session, "legacy-reset@example.com")
    reset_token = create_token(user.id, "reset", timedelta(hours=1))
    with pytest.raises(AppError) as exc_info:
        await AuthService(db_session).reset_password(reset_token, "NewPassword123!")
    assert exc_info.value.status_code == 404
    assert exc_info.value.message == "User not found"


async def test_valid_user_authentication_still_works(db_session):
    password = "Password123!"
    user = User(
        email="valid@example.com",
        name="Valid User",
        password_hash=hash_password(password),
        role=UserRole.MOTHER,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    tokens = await AuthService(db_session).login("valid@example.com", password)
    assert tokens.access_token
    assert tokens.refresh_token

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=tokens.access_token)
    resolved = await get_current_user(credentials, db_session)
    assert resolved.id == user.id
    assert resolved.role == UserRole.MOTHER


def test_legacy_role_guard_matches_only_user_role_enum_errors():
    legacy_message = (
        "'ASHA_WORKER' is not among the defined enum values. "
        "Enum name: user_role. Possible values: MOTHER, CAREGIVER, DOCTOR, ADMIN"
    )
    assert is_legacy_role_lookup_error(LookupError(legacy_message))
    assert not is_legacy_role_lookup_error(LookupError("unrelated failure"))
    other_enum = LookupError(
        "'X' is not among the defined enum values. Enum name: risk_level. Possible values: LOW, HIGH"
    )
    assert not is_legacy_role_lookup_error(other_enum)


async def test_unrelated_lookuperror_propagates_from_login(db_session, monkeypatch):
    async def _boom(self, email):
        raise LookupError("unrelated failure")

    monkeypatch.setattr(UserRepository, "get_by_email", _boom)
    with pytest.raises(LookupError, match="unrelated failure"):
        await AuthService(db_session).login("anyone@example.com", "Password123!")
