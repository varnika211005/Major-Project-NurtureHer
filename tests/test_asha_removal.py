"""Regression tests for ASHA Worker role removal.

The four supported roles are mother, doctor, caregiver, and admin.
High-risk case creation must work without any worker assignment, and
existing asha_worker rows must be deactivated (never deleted) by migration
0003 because the enum member no longer exists.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base
from app.core.security import UserRole
from app.main import app
from app.models.asha import HighRiskCase
from app.models.enums import RiskLevel
from app.models.user import User
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
