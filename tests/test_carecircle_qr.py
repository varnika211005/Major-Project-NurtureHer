from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

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
from app.models.carecircle import CareCircleAccess, CareCircleQR
from app.models.user import User


@pytest.fixture
async def carecircle_api() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
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


async def create_mother_qr(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    expired: bool = False,
) -> tuple[User, CareCircleQR]:
    async with session_factory() as db:
        mother = await create_user(db, UserRole.MOTHER, "Mother")
        qr = CareCircleQR.create_token(mother.id)
        if expired:
            qr.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.add(qr)
        await db.commit()
        await db.refresh(qr)
        return mother, qr


@pytest.mark.asyncio
async def test_valid_qr_creates_pending_request_without_exposing_health_data(carecircle_api):
    client, session_factory, current_user = carecircle_api
    _, qr = await create_mother_qr(session_factory)
    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        await db.commit()
    current_user["user"] = caregiver

    response = await client.post("/api/v1/carecircle/request-access", json={"token": qr.token})
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert "health" not in response.json()
    status_response = await client.get(f"/api/v1/carecircle/requests/{response.json()['id']}/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "pending"

    summary = await client.get(f"/api/v1/carecircle/shared-summary/{response.json()['id']}")
    assert summary.status_code == 403


@pytest.mark.asyncio
async def test_invalid_and_expired_qr_tokens_are_rejected(carecircle_api):
    client, session_factory, current_user = carecircle_api
    _, expired_qr = await create_mother_qr(session_factory, expired=True)
    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        await db.commit()
    current_user["user"] = caregiver

    invalid = await client.post("/api/v1/carecircle/request-access", json={"token": "invalid-token-value"})
    expired = await client.post("/api/v1/carecircle/request-access", json={"token": expired_qr.token})
    assert invalid.status_code == 404
    assert invalid.json()["detail"] == "Invalid QR token"
    assert expired.status_code == 410
    assert expired.json()["detail"] == "QR token expired"


@pytest.mark.asyncio
async def test_generating_a_new_qr_expires_the_previous_token(carecircle_api):
    client, session_factory, current_user = carecircle_api
    mother, old_qr = await create_mother_qr(session_factory)
    current_user["user"] = mother

    refreshed = await client.post("/api/v1/carecircle/qr/generate")
    assert refreshed.status_code == 200
    assert refreshed.json()["token"] != old_qr.token

    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        await db.commit()
    current_user["user"] = caregiver
    response = await client.post("/api/v1/carecircle/request-access", json={"token": old_qr.token})
    assert response.status_code == 410


@pytest.mark.asyncio
async def test_revoked_access_requires_new_approval_after_rescan(carecircle_api):
    client, session_factory, current_user = carecircle_api
    mother, qr = await create_mother_qr(session_factory)
    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        access = CareCircleAccess(
            user_id=mother.id,
            requester_id=caregiver.id,
            relationship_label="Caregiver",
            status="revoked",
            revoked_at=datetime.now(timezone.utc),
        )
        db.add(access)
        await db.commit()
        existing_access_id = access.id
    current_user["user"] = caregiver

    revoked_status = await client.get(f"/api/v1/carecircle/requests/{existing_access_id}/status")
    assert revoked_status.status_code == 200
    assert revoked_status.json()["status"] == "revoked"
    response = await client.post("/api/v1/carecircle/request-access", json={"token": qr.token})
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert "previous access was revoked" in response.json()["message"].lower()
    assert response.json()["id"] == str(existing_access_id)
    summary = await client.get(f"/api/v1/carecircle/shared-summary/{existing_access_id}")
    assert summary.status_code == 403
    async with session_factory() as db:
        access_count = await db.scalar(select(func.count()).select_from(CareCircleAccess))
        old_access = await db.get(CareCircleAccess, existing_access_id)
        assert old_access.status == "revoked"
    assert access_count == 1


@pytest.mark.asyncio
async def test_only_mother_can_manage_qr_and_access_requests(carecircle_api):
    client, session_factory, current_user = carecircle_api
    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        await db.commit()
    current_user["user"] = caregiver

    assert (await client.get("/api/v1/carecircle/qr")).status_code == 403
    assert (await client.post("/api/v1/carecircle/qr/generate")).status_code == 403
    assert (await client.get("/api/v1/carecircle/requests")).status_code == 403


@pytest.mark.asyncio
async def test_approved_restricted_scopes_and_other_requester_denial(carecircle_api):
    client, session_factory, current_user = carecircle_api
    mother, _ = await create_mother_qr(session_factory)
    async with session_factory() as db:
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        other_caregiver = await create_user(db, UserRole.CAREGIVER, "Other Caregiver")
        access = CareCircleAccess(
            user_id=mother.id,
            requester_id=caregiver.id,
            relationship_label="Caregiver",
            status="approved",
            share_emergency=False,
            share_risk_category=False,
            share_wellness_summary=False,
        )
        db.add(access)
        await db.commit()
        access_id = str(access.id)

    current_user["user"] = caregiver
    summary = await client.get(f"/api/v1/carecircle/shared-summary/{access_id}")
    assert summary.status_code == 200
    assert set(summary.json()) == {"mother_name", "relationship_label", "status"}

    current_user["user"] = other_caregiver
    denied = await client.get(f"/api/v1/carecircle/shared-summary/{access_id}")
    assert denied.status_code == 403
