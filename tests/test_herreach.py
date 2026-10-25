import pytest
from unittest.mock import AsyncMock
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
async def test_herreach_osm_fallback_when_google_api_key_unconfigured(monkeypatch):
    monkeypatch.setattr("app.services.herreach.settings.google_maps_api_key", None)
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    class MockResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data

        def json(self):
            return self._data

    async def mock_osm_get(self, url, *args, params=None, **kwargs):
        p = params or kwargs.get("params") or {}
        # Geocode response for area
        if "postalcode" in p or "q" in p and p.get("q") == "Indiranagar, Bengaluru":
            return MockResponse(200, [{"lat": "12.9784", "lon": "77.6408"}])
        # Search response
        return MockResponse(
            200,
            [
                {
                    "place_id": 987654,
                    "osm_type": "way",
                    "osm_id": 1234567,
                    "name": "Chinmaya Mission Hospital",
                    "display_name": "Chinmaya Mission Hospital, CMH Road, Indiranagar, Bengaluru",
                    "lat": "12.9790",
                    "lon": "77.6420",
                    "type": "hospital",
                    "extratags": {
                        "phone": "+91-80-25280444",
                        "opening_hours": "24/7",
                    },
                }
            ],
        )

    monkeypatch.setattr("httpx.AsyncClient.get", mock_osm_get)

    res = await service.search_facilities(
        query="Chinmaya",
        category="hospital",
        area="Indiranagar, Bengaluru",
    )

    assert res.is_live_provider is True
    assert res.provider_name == "OpenStreetMap (Nominatim)"
    assert res.total_found == 1
    assert len(res.facilities) == 1
    fac = res.facilities[0]
    assert fac.name == "Chinmaya Mission Hospital"
    assert fac.rating is None  # Truthful representation of OSM
    assert fac.contact_number == "+91-80-25280444"
    assert fac.opening_hours == "24/7"
    assert "destination=12.97900,77.64200" in fac.directions_url
    assert len(res.official_helplines) > 0


@pytest.mark.asyncio
async def test_herreach_fallback_when_both_providers_fail(monkeypatch):
    monkeypatch.setattr("app.services.herreach.settings.google_maps_api_key", None)
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    async def mock_failing_get(*args, **kwargs):
        raise ConnectionError("Network offline")

    monkeypatch.setattr("httpx.AsyncClient.get", mock_failing_get)

    # Search with no Google key and failing OSM network
    res = await service.search_facilities(
        query="Apollo",
        category="gynaecology",
        area="Indiranagar, Bengaluru",
    )

    assert res.is_live_provider is False
    assert "unavailable" in res.provider_status.lower()
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


@pytest.mark.asyncio
async def test_herreach_pincode_560096_search_and_keyword_mapping(monkeypatch):
    """Verify PIN 560096 uses postal_code component geocoding, 'hospital' keyword, and maps facilities."""
    from app.services.herreach import GOOGLE_KEYWORD_MAP

    # Confirm keyword map is clean "hospital", not overly restrictive "hospital multi-specialty"
    assert GOOGLE_KEYWORD_MAP.get("hospital") == "hospital"

    monkeypatch.setattr("app.services.herreach.settings.google_maps_api_key", "mock_key_bangalore")
    mock_db = AsyncMock()
    service = HerReachService(mock_db)

    # Capture calls made to client.get (geocoding) and client.post (places searchText)
    recorded_get_params = {}
    recorded_post_json = {}

    class MockResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self._data = data

        def json(self):
            return self._data

    async def mock_get(self, url, *args, params=None, **kwargs):
        nonlocal recorded_get_params
        recorded_get_params = params or kwargs.get("params") or {}
        # Return mock geocoded coordinates for 560096 (Rajajinagar/Malleshwaram area)
        return MockResponse(
            200,
            {
                "results": [
                    {
                        "geometry": {
                            "location": {"lat": 13.0116, "lng": 77.5546}
                        }
                    }
                ]
            },
        )

    async def mock_post(self, url, *args, headers=None, json=None, **kwargs):
        nonlocal recorded_post_json
        recorded_post_json = json or kwargs.get("json") or {}
        return MockResponse(
            200,
            {
                "places": [
                    {
                        "id": "places/ChIJmockhospital560096",
                        "displayName": {"text": "KC General Hospital"},
                        "formattedAddress": "5th Cross Road, Malleshwaram, Bengaluru 560096",
                        "location": {"latitude": 13.0032, "longitude": 77.5685},
                        "rating": 4.1,
                        "userRatingCount": 380,
                        "currentOpeningHours": {"openNow": True},
                    }
                ]
            },
        )

    # Mock httpx.AsyncClient get and post
    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)

    res = await service.search_facilities(
        query=None,
        category="hospital",
        area="560096",
    )

    # Verify geocoding components filter was used for 6-digit PIN
    assert recorded_get_params.get("components") == "country:IN|postal_code:560096"
    assert recorded_get_params.get("address") == "560096"

    # Verify searchText query includes hospital and area
    assert "hospital" in recorded_post_json.get("textQuery", "")
    assert "560096" in recorded_post_json.get("textQuery", "")
    # Verify locationBias is centered around resolved geocoded coordinates
    bias_center = recorded_post_json.get("locationBias", {}).get("circle", {}).get("center", {})
    assert bias_center.get("latitude") == 13.0116
    assert bias_center.get("longitude") == 77.5546

    # Verify facilities are mapped accurately
    assert res.is_live_provider is True
    assert res.total_found == 1
    assert len(res.facilities) == 1
    facility = res.facilities[0]
    assert facility.name == "KC General Hospital"
    assert "560096" in facility.address
    assert facility.rating == 4.1
    assert facility.user_ratings_total == 380
    assert facility.opening_hours == "Open now"
    # Accurately None because caller provided area PIN without device GPS coordinates (no invented distance)
    assert facility.distance_km is None
