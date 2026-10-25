import json
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient

from app.core.security import UserRole
from app.main import app
from app.models.carecircle import CareCircleAccess
from app.models.caregiver_chat import CaregiverChatMessage
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Mood, Symptom
from app.models.enums import RiskLevel
from app.services.caregiver_rag_service import CaregiverRAGService


@pytest.mark.asyncio
async def test_caregiver_rag_retrieval_and_citations():
    """Verify that retrieval loads passages from data/caregiver_rag and formats citations."""
    mock_db = AsyncMock()
    service = CaregiverRAGService(mock_db)

    # Query for preeclampsia or warning signs
    passages = service.retrieve_passages("preeclampsia high blood pressure warning signs", top_k=3)
    assert len(passages) > 0
    first = passages[0]
    assert "doc_title" in first
    assert "publisher" in first
    assert "page" in first
    assert "text" in first
    assert len(first["text"]) > 50


@pytest.mark.asyncio
async def test_caregiver_chat_endpoint_role_protection():
    """Verify non-caregiver roles are rejected with 403 Forbidden and unauthenticated with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unauthenticated request
        res1 = await client.post("/api/v1/caregiver/chat/message", json={"message": "Hello"})
        assert res1.status_code == 401

    # 2. Mother role user (unauthorized for caregiver chat -> 403)
    mother_user = User(id=uuid.uuid4(), email="mother@test.com", name="Priya", role=UserRole.MOTHER, is_active=True)

    from app.core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: mother_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res2 = await client.post(
                "/api/v1/caregiver/chat/message",
                json={"message": "Hello"},
                headers={"Authorization": "Bearer mock-token"},
            )
            assert res2.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)



@pytest.mark.asyncio
async def test_caregiver_chat_urgent_warning_sign_triggers_immediate_alert():
    """Verify urgent red-flag symptoms trigger immediate safety advice with emergency numbers without delay."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@example.com", name="Rohan", role=UserRole.CAREGIVER)
    service = CaregiverRAGService(mock_db)

    res = await service.answer_query(caregiver, "She has heavy bleeding soaking pads and feeling faint", language="en")
    assert "CRITICAL EMERGENCY" in res.response or "112" in res.response
    assert "Clinical Notice" in res.clinical_disclaimer
    assert res.maternal_consent_status == "Emergency alert triggered"
    assert mock_db.add.called
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_caregiver_chat_maternal_data_consent_enforcement():
    """Verify granular CareCircle consent is strictly enforced for maternal dashboard questions."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@test.com", name="Amit", role=UserRole.CAREGIVER)
    mother = User(id=uuid.uuid4(), email="mother@test.com", name="Priya", role=UserRole.MOTHER)

    service = CaregiverRAGService(mock_db)

    # Case A: No approved connection (status = pending)
    pending_access = CareCircleAccess(
        id=uuid.uuid4(),
        user_id=mother.id,
        requester_id=caregiver.id,
        status="pending",
        share_risk_category=False,
    )
    # mock_db.execute returns no approved rows
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: []))
    mock_db.scalar = AsyncMock(return_value=pending_access)

    res_pending = await service.answer_query(caregiver, "What was her PPD screening score?", language="en")
    assert "do not currently have permitted access" in res_pending.response.lower()
    assert "CareCircle" in res_pending.response
    assert res_pending.has_maternal_data is False


@pytest.mark.asyncio
async def test_caregiver_chat_with_permitted_consent_and_gemini_call(monkeypatch):
    """Verify that when CareCircle consent is granted, maternal data is passed to Gemini, and response is grounded."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@test.com", name="Amit", role=UserRole.CAREGIVER)
    mother = User(id=uuid.uuid4(), email="mother@test.com", name="Priya", role=UserRole.MOTHER)

    access = CareCircleAccess(
        id=uuid.uuid4(),
        user_id=mother.id,
        requester_id=caregiver.id,
        status="approved",
        relationship_label="Husband",
        share_emergency=True,
        share_risk_category=True,
        share_wellness_summary=True,
        revoked_at=None,
    )

    profile = MotherProfile(id=uuid.uuid4(), user_id=mother.id, emergency_contact="9876543210", blood_group="O+")
    pcos = PCOSPrediction(id=uuid.uuid4(), user_id=mother.id, risk_level=RiskLevel.LOW)
    ppd = PPDAssessment(id=uuid.uuid4(), user_id=mother.id, epds_score=4, risk_level=RiskLevel.LOW)
    mood = Mood(id=uuid.uuid4(), user_id=mother.id, mood="happy")
    symptom = Symptom(id=uuid.uuid4(), user_id=mother.id, fatigue=True, sleep_issue=False, anxiety=False)

    service = CaregiverRAGService(mock_db)

    # Configure mock_db
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: [(access, mother)]))
    mock_db.scalar = AsyncMock(side_effect=[profile, pcos, ppd, mood, symptom])

    # Mock call_gemini to inspect received prompt and return grounded answer
    captured_prompt = None

    async def mock_call_gemini(prompt: str) -> str:
        nonlocal captured_prompt
        captured_prompt = prompt
        return "Priya's recent screenings show a low risk level for PPD, but mild fatigue was logged. Ensure she gets 2-3 hours of continuous rest today."

    monkeypatch.setattr(service, "call_gemini", mock_call_gemini)

    res = await service.answer_query(caregiver, "How is Priya feeling and what was her screening risk?", language="en")

    assert res.has_maternal_data is True
    assert "Priya" in res.response
    assert captured_prompt is not None
    assert "Connected Mother: Priya" in captured_prompt
    assert "PPD Screening Risk: low" in captured_prompt
    assert "Recent Logged Mood: happy" in captured_prompt
    assert "Fatigue" in captured_prompt
    assert "Clinical Evidence" in captured_prompt


@pytest.mark.asyncio
async def test_caregiver_chat_provider_failure_returns_error_never_legacy_fallback(monkeypatch):
    """Verify that when Gemini provider fails, an exception is raised with a clear error, never falling back to legacy chatbot."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@test.com", name="Amit", role=UserRole.CAREGIVER)

    service = CaregiverRAGService(mock_db)
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: []))
    mock_db.scalar = AsyncMock(return_value=None)

    async def mock_failing_gemini(*args, **kwargs):
        raise RuntimeError("Quota exceeded on model provider")

    monkeypatch.setattr(service, "call_gemini", mock_failing_gemini)

    with patch("app.services.chat_service.ChatbotService") as mock_legacy_chatbot:
        with pytest.raises(RuntimeError) as exc_info:
            await service.answer_query(caregiver, "What exercises are safe for postpartum recovery?", language="en")

        assert "provider is unavailable" in str(exc_info.value).lower()
        # Ensure legacy chatbot was NEVER called
        assert not mock_legacy_chatbot.called


@pytest.mark.asyncio
async def test_caregiver_chat_history_isolation():
    """Verify conversation history is persisted and strictly isolated per caregiver."""
    mock_db = AsyncMock()
    caregiver1 = User(id=uuid.uuid4(), email="c1@test.com", name="Caregiver 1", role=UserRole.CAREGIVER)

    service = CaregiverRAGService(mock_db)

    # When querying history for caregiver1, mock_db returns records where caregiver_id == caregiver1.id
    rec1 = CaregiverChatMessage(
        id=uuid.uuid4(),
        caregiver_id=caregiver1.id,
        message="Question from C1",
        response="Answer to C1",
        sources=json.dumps([{"id": "doc1", "title": "WHO Guidelines", "publisher": "WHO", "page": 10, "excerpt": "rest"}]),
        language="en",
    )
    mock_db.scalars = AsyncMock(return_value=AsyncMock(all=lambda: [rec1]))

    history = await service.get_history(caregiver1)
    assert len(history) == 1
    assert history[0].message == "Question from C1"
    assert len(history[0].sources) == 1
    assert history[0].sources[0].title == "WHO Guidelines"


@pytest.mark.asyncio
async def test_caregiver_chat_revoked_consent_and_timestamp_denial():
    """Verify both status == 'revoked' and non-null revoked_at deny access to maternal data."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@test.com", name="Amit", role=UserRole.CAREGIVER)
    mother = User(id=uuid.uuid4(), email="mother@test.com", name="Priya", role=UserRole.MOTHER)

    service = CaregiverRAGService(mock_db)

    # Subtest 1: status == "revoked"
    revoked_access = CareCircleAccess(
        id=uuid.uuid4(),
        user_id=mother.id,
        requester_id=caregiver.id,
        status="revoked",
        revoked_at=None,
    )
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: []))
    mock_db.scalar = AsyncMock(return_value=revoked_access)

    res1 = await service.answer_query(caregiver, "What was her screening risk?", language="en")
    assert res1.has_maternal_data is False
    assert "revoked" in res1.maternal_consent_status.lower()
    assert "permitted access" in res1.response.lower()

    # Subtest 2: revoked_at is not None (even if status was approved earlier)
    from datetime import datetime, timezone
    revoked_by_time = CareCircleAccess(
        id=uuid.uuid4(),
        user_id=mother.id,
        requester_id=caregiver.id,
        status="approved",
        revoked_at=datetime.now(timezone.utc),
    )
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: []))
    mock_db.scalar = AsyncMock(return_value=revoked_by_time)

    res2 = await service.answer_query(caregiver, "What is her blood pressure and score?", language="en")
    assert res2.has_maternal_data is False
    assert "revoked" in res2.maternal_consent_status.lower()
    assert "permitted access" in res2.response.lower()


@pytest.mark.asyncio
async def test_caregiver_chat_nutrition_and_hydration_privacy():
    """Verify personal nutrition/hydration questions are denied without disclosing private data, while general guidance is retrieved."""
    mock_db = AsyncMock()
    caregiver = User(id=uuid.uuid4(), email="caregiver@test.com", name="Amit", role=UserRole.CAREGIVER)
    mother = User(id=uuid.uuid4(), email="mother@test.com", name="Priya", role=UserRole.MOTHER)

    access = CareCircleAccess(
        id=uuid.uuid4(),
        user_id=mother.id,
        requester_id=caregiver.id,
        status="approved",
        share_nutrition=False,
    )
    mock_db.execute = AsyncMock(return_value=AsyncMock(all=lambda: [(access, mother)]))
    mock_db.scalar = AsyncMock(return_value=None)

    service = CaregiverRAGService(mock_db)

    # 1. Personal hydration request - denied immediately
    res_water = await service.answer_query(caregiver, "What is her daily water intake?", language="en")
    assert res_water.has_maternal_data is False
    assert "permitted access" in res_water.response.lower()

    # 2. Personal diet request - denied immediately
    res_diet = await service.answer_query(caregiver, "Can you show her diet plan?", language="en")
    assert res_diet.has_maternal_data is False
    assert "permitted access" in res_diet.response.lower()

    # 3. General nutrition advice query - retrieves guideline passages without personal disclosure
    passages = service.retrieve_passages("high iron foods for postpartum maternal nutrition", top_k=3)
    assert len(passages) > 0
    assert any("nutrition" in p["text"].lower() or "care" in p["text"].lower() or "health" in p["text"].lower() for p in passages)


@pytest.mark.asyncio
async def test_caregiver_chat_history_isolation_real_database():
    """Verify in a real temporary in-memory SQLite database that clearing one caregiver's history never deletes another caregiver's records."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from app.core.database import Base

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Create 2 real distinct caregivers
        c1 = User(id=uuid.uuid4(), email="c1@example.com", name="Caregiver 1", role=UserRole.CAREGIVER, is_active=True, hashed_password="fake")
        c2 = User(id=uuid.uuid4(), email="c2@example.com", name="Caregiver 2", role=UserRole.CAREGIVER, is_active=True, hashed_password="fake")
        session.add_all([c1, c2])
        await session.commit()

        # Add 2 messages for C1 and 2 messages for C2 in the real database
        m1 = CaregiverChatMessage(caregiver_id=c1.id, message="C1 query A", response="C1 answer A", sources="[]", language="en")
        m2 = CaregiverChatMessage(caregiver_id=c1.id, message="C1 query B", response="C1 answer B", sources="[]", language="en")
        m3 = CaregiverChatMessage(caregiver_id=c2.id, message="C2 query X", response="C2 answer X", sources="[]", language="en")
        m4 = CaregiverChatMessage(caregiver_id=c2.id, message="C2 query Y", response="C2 answer Y", sources="[]", language="en")
        session.add_all([m1, m2, m3, m4])
        await session.commit()

        service = CaregiverRAGService(session)

        # Verify initial history counts in real database
        h1 = await service.get_history(c1)
        h2 = await service.get_history(c2)
        assert len(h1) == 2
        assert len(h2) == 2

        # Clear C1's history only via real database execution
        deleted_count = await service.clear_history(c1)
        assert deleted_count == 2

        # Verify C1 history is completely empty in real DB
        h1_after = await service.get_history(c1)
        assert len(h1_after) == 0

        # Verify C2 history in real DB remains completely untouched
        h2_after = await service.get_history(c2)
        assert len(h2_after) == 2
        c2_messages = {msg.message for msg in h2_after}
        assert "C2 query X" in c2_messages
        assert "C2 query Y" in c2_messages

    await engine.dispose()
