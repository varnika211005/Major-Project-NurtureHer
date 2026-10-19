from collections.abc import AsyncIterator
from datetime import datetime, timezone
from uuid import UUID

import app.models  # noqa: F401
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_current_user
from app.core.database import Base, get_db
from app.core.security import UserRole
from app.main import app
from app.models.carecircle import CareCircleAccess
from app.models.nutrition import NutritionCarePlan, NutritionProfile
from app.models.user import MotherProfile, User


@pytest.fixture
async def nutrition_api() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession], dict[str, User | None]]]:
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


async def create_user(db: AsyncSession, role: UserRole, label: str) -> User:
    user = User(
        name=label,
        email=f"{label.lower().replace(' ', '.')}@example.com",
        password_hash="test-hash",
        role=role,
        preferred_language="en",
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


async def create_authorized_connection(
    session_factory: async_sessionmaker[AsyncSession],
    doctor_or_caregiver: User,
    mother: User,
    *,
    nutrition: bool,
    status: str = "approved",
) -> UUID:
    async with session_factory() as db:
        connection = CareCircleAccess(
            user_id=mother.id,
            requester_id=doctor_or_caregiver.id,
            relationship_label="Care team",
            status=status,
            revoked_at=datetime.now(timezone.utc) if status == "revoked" else None,
            share_nutrition=nutrition,
        )
        db.add(connection)
        await db.commit()
        return connection.id


@pytest.mark.asyncio
async def test_mother_preferences_and_daily_actions_are_private(nutrition_api):
    client, session_factory, current_user = nutrition_api
    async with session_factory() as db:
        mother = await create_user(db, UserRole.MOTHER, "Mother")
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        await db.commit()
    current_user["user"] = mother

    saved = await client.put(
        "/api/v1/nutrition/preferences",
        json={
            "dietary_preferences": ["vegetarian"],
            "dietary_restrictions": ["dairy-free"],
            "allergies": ["milk"],
            "breastfeeding": True,
        },
    )
    assert saved.status_code == 200
    assert saved.json()["breastfeeding"] is True

    response = await client.get("/api/v1/nutrition/me")
    assert response.status_code == 200
    assert response.json()["preferences"]["allergies"] == ["milk"]
    assert all("milk" not in " ".join(item["ingredients"]).lower() for item in response.json()["suggestions"])

    suggestion_key = response.json()["suggestions"][0]["key"]
    action = await client.put(
        f"/api/v1/nutrition/interactions/{suggestion_key}?completed=true&saved=true"
    )
    assert action.status_code == 200
    assert action.json()["completed"] is True

    current_user["user"] = caregiver
    denied = await client.get("/api/v1/nutrition/me")
    assert denied.status_code == 403


@pytest.mark.asyncio
async def test_caregiver_requires_active_approved_nutrition_scope(nutrition_api):
    client, session_factory, current_user = nutrition_api
    async with session_factory() as db:
        mother = await create_user(db, UserRole.MOTHER, "Mother")
        caregiver = await create_user(db, UserRole.CAREGIVER, "Caregiver")
        db.add(NutritionProfile(user_id=mother.id, allergies=["peanut"]))
        await db.commit()

    current_user["user"] = caregiver
    missing_connection = await client.get(f"/api/v1/nutrition/caregiver/connections/{mother.id}")
    assert missing_connection.status_code == 404

    access_id = await create_authorized_connection(session_factory, caregiver, mother, nutrition=False)
    scope_denied = await client.get(f"/api/v1/nutrition/caregiver/connections/{access_id}")
    assert scope_denied.status_code == 403

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_id)
        assert access is not None
        access.share_nutrition = True
        await db.commit()
    permitted = await client.get(f"/api/v1/nutrition/caregiver/connections/{access_id}")
    assert permitted.status_code == 200
    assert permitted.json()["preferences"]["allergies"] == ["peanut"]
    assert "plans" not in permitted.json()

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_id)
        assert access is not None
        access.revoked_at = datetime.now(timezone.utc)
        access.status = "revoked"
        await db.commit()
    revoked = await client.get(f"/api/v1/nutrition/caregiver/connections/{access_id}")
    assert revoked.status_code == 404


@pytest.mark.asyncio
async def test_doctor_patient_scope_draft_publish_and_cross_patient_denial(nutrition_api):
    client, session_factory, current_user = nutrition_api
    async with session_factory() as db:
        doctor = await create_user(db, UserRole.DOCTOR, "Doctor")
        mother = await create_user(db, UserRole.MOTHER, "Mother")
        other_mother = await create_user(db, UserRole.MOTHER, "Other Mother")
        db.add(MotherProfile(user_id=mother.id, pregnancy_status="Second trimester"))
        await db.commit()
    access_id = await create_authorized_connection(session_factory, doctor, mother, nutrition=True)
    current_user["user"] = doctor

    roster = await client.get("/api/v1/nutrition/doctor/patients")
    assert roster.status_code == 200
    assert [item["id"] for item in roster.json()] == [str(mother.id)]

    unavailable = await client.get(f"/api/v1/nutrition/doctor/patients/{other_mother.id}")
    assert unavailable.status_code == 404

    payload = {
        "title": "Reviewed food plan",
        "applicable_context": ["pregnancy"],
        "meals": [{
            "name": "Lentil and rice bowl",
            "meal_type": "lunch",
            "ingredients": ["lentils", "rice"],
            "serving_size": "As discussed with patient",
            "preparation_instructions": ["Cook thoroughly."],
            "preparation_minutes": 30,
            "substitutions": [],
            "nutrition_facts": [],
            "nutrition_source": None,
        }],
        "preparation_guidance": "Follow the patient's existing clinician guidance.",
        "clinician_note": "Draft for review",
    }
    draft = await client.post(f"/api/v1/nutrition/doctor/patients/{mother.id}/plans", json=payload)
    assert draft.status_code == 200
    assert draft.json()["status"] == "draft"
    assert draft.json()["source"] == "doctor_authored"

    fact_without_source = {**payload, "meals": [{**payload["meals"][0], "nutrition_facts": ["Energy: 100"]}]}
    invalid_facts = await client.post(
        f"/api/v1/nutrition/doctor/patients/{mother.id}/plans",
        json=fact_without_source,
    )
    assert invalid_facts.status_code == 422

    published = await client.post(
        f"/api/v1/nutrition/doctor/patients/{mother.id}/plans/{draft.json()['id']}/publish"
    )
    assert published.status_code == 200
    assert published.json()["status"] == "active"
    assert published.json()["source"] == "doctor_reviewed"

    current_user["user"] = mother
    mother_view = await client.get("/api/v1/nutrition/me")
    assert mother_view.status_code == 200
    assert mother_view.json()["active_plan"]["source"] == "doctor_reviewed"

    current_user["user"] = doctor
    denied_cross_patient_publish = await client.post(
        f"/api/v1/nutrition/doctor/patients/{other_mother.id}/plans/{draft.json()['id']}/publish"
    )
    assert denied_cross_patient_publish.status_code == 404

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_id)
        assert access is not None
        access.share_nutrition = False
        await db.commit()
    denied_scope = await client.get(f"/api/v1/nutrition/doctor/patients/{mother.id}")
    assert denied_scope.status_code == 403
    assert (await client.get("/api/v1/nutrition/doctor/patients")).json() == []

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_id)
        assert access is not None
        access.share_nutrition = True
        access.status = "revoked"
        access.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    denied_revoked = await client.get(f"/api/v1/nutrition/doctor/patients/{mother.id}")
    assert denied_revoked.status_code == 404

    async with session_factory() as db:
        access = await db.get(CareCircleAccess, access_id)
        plan = await db.scalar(select(NutritionCarePlan).where(NutritionCarePlan.mother_id == mother.id))
        assert access is not None and access.share_nutrition
        assert plan is not None and plan.reviewer_id == doctor.id
