import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.core.security import UserRole
from app.models.enums import RiskLevel
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.services.herreach import HerReachService, haversine_distance_km


def test_haversine_distance_calculation():
    # Bengaluru (12.9716, 77.5946) to Chennai (13.0827, 80.2707) is approx 290 km
    dist = haversine_distance_km(12.9716, 77.5946, 13.0827, 80.2707)
    assert 280.0 <= dist <= 310.0

    # Same location should be 0.0 km
    assert haversine_distance_km(12.9716, 77.5946, 12.9716, 77.5946) == 0.0


@pytest.mark.asyncio
async def test_herreach_fallback_when_api_key_unconfigured(monkeypatch):
    monkeypatch.setattr("app.services.herreach.settings.google_maps_api_key", None)
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    # Search with no API key configured
    res = await service.search_facilities(
        query="Apollo",
        category="gynaecology",
        area="Indiranagar, Bengaluru",
    )

    assert res.is_live_provider is False
    assert "GOOGLE_MAPS_API_KEY" in res.provider_status
    assert res.total_found == 0
    assert len(res.facilities) == 0  # Crucial requirement: zero fabricated facilities
    assert "google.com/maps/search" in res.external_search_url
    assert len(res.official_helplines) > 0

    # Check verified emergency numbers exist
    numbers = [h.number for h in res.official_helplines]
    assert "112" in numbers
    assert "108" in numbers
    assert "14416" in numbers


@pytest.mark.asyncio
async def test_herreach_mother_recommendations_with_pcos_and_ppd():
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    user = User(
        id=uuid4(),
        email="mother@example.com",
        name="Ananya",
        role=UserRole.MOTHER,
    )

    mock_pcos = PCOSPrediction(
        id=uuid4(),
        user_id=user.id,
        risk_level=RiskLevel.HIGH,
        probability=0.82,
        recommendations="Pelvic ultrasound recommended",
    )

    mock_ppd = PPDAssessment(
        id=uuid4(),
        user_id=user.id,
        epds_score=14,
        sentiment="Negative",
        risk_level=RiskLevel.HIGH,
    )

    mock_profile = MotherProfile(
        id=uuid4(),
        user_id=user.id,
        pregnancy_status="Third Trimester (32 Weeks)",
    )

    # Configure db.scalar to return pcos, ppd, profile in order
    mock_db.scalar = AsyncMock(side_effect=[mock_pcos, mock_ppd, mock_profile])

    rec_res = await service.get_recommendations_for_mother(user)

    assert rec_res.user_role == "mother"
    assert rec_res.has_pcos_data is True
    assert rec_res.has_ppd_data is True
    assert rec_res.has_pregnancy_data is True

    # Check non-diagnostic safety wording
    assert "not medical diagnoses" in rec_res.clinical_disclaimer.lower()

    keys = [r.concern_key for r in rec_res.recommendations]
    assert "pcos" in keys
    assert "ppd" in keys
    assert "pregnancy" in keys
    assert "urgent" in keys
    assert "general" in keys

    # Check urgent concern contains safety guidance
    urgent_rec = next(r for r in rec_res.recommendations if r.concern_key == "urgent")
    assert "Never delay" in urgent_rec.clinical_safety_notice


@pytest.mark.asyncio
async def test_herreach_mother_recommendations_empty_assessments():
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    user = User(
        id=uuid4(),
        email="mother_new@example.com",
        name="Priya",
        role=UserRole.MOTHER,
    )

    # Return None for pcos, ppd, profile
    mock_db.scalar = AsyncMock(side_effect=[None, None, None])

    rec_res = await service.get_recommendations_for_mother(user)

    assert rec_res.has_pcos_data is False
    assert rec_res.has_ppd_data is False
    assert rec_res.has_pregnancy_data is False

    keys = [r.concern_key for r in rec_res.recommendations]
    # No fabricated PCOS or PPD recommendations
    assert "pcos" not in keys
    assert "ppd" not in keys
    # Urgent and General discovery are provided
    assert "urgent" in keys
    assert "general" in keys
