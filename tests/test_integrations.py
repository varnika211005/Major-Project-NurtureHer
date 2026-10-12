import pytest

from app.models.enums import RiskLevel
from app.services.gemini_service import GeminiService
from app.services.ppd_service import PPDRiskDetectionService
from app.services.scoring_engine import EPDScoringEngine
from app.services.sms_provider import get_sms_provider


def test_epds_scoring_engine_classifies_moderate(moderate_ppd_payload):
    service = PPDRiskDetectionService()
    score, sentiment, risk = service.assess(moderate_ppd_payload)
    assert score == 10
    assert sentiment == "negative"
    assert risk == RiskLevel.MODERATE


def test_epds_rejects_invalid_length():
    with pytest.raises(ValueError):
        EPDScoringEngine().score([1, 2, 3])


@pytest.mark.asyncio
async def test_gemini_fallback_without_api_key():
    from unittest.mock import patch
    with patch("app.services.gemini_service.settings") as mock_settings:
        mock_settings.gemini_api_key = ""
        mock_settings.gemini_model = "gemini-3.5-flash-lite"
        response = await GeminiService().generate_response("I have cramps", "en")
    assert "wellness" in response.lower() or "guidance" in response.lower() or "health" in response.lower()


def test_sms_provider_simulates_without_credentials():
    assert get_sms_provider().send_sms("+910000000000", "Test alert") is True

