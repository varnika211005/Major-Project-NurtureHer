"""Opt-in LIVE Gemini evaluation for chat answer quality.

Double-gated: module-level skip + NURTUREHER_LIVE_EVAL=1 env requirement.
Makes real API calls (latency + token cost) — requires explicit approval.
Measures generation latency; token cost is estimated from response length
(the generateContent wrapper does not surface usage metadata).

Software assertions in test_chat_eval.py cover everything deterministic;
this file covers only live generation quality and must never be claimed
as clinical validation.
"""

import os
import time

import pytest

pytestmark = pytest.mark.skip(reason="opt-in live Gemini evaluation; requires explicit approval")

LIVE_ENABLED = os.getenv("NURTUREHER_LIVE_EVAL") == "1"

LIVE_CASES = [
    ("en", "What are common signs of PCOS?"),
    ("hi", "प्रसव के बाद उदासी कब डॉक्टर को दिखानी चाहिए?"),
    ("kn", "ಪಿಸಿಓಎಸ್ ಲಕ್ಷಣಗಳು ಯಾವುವು?"),
]


@pytest.mark.skipif(not LIVE_ENABLED, reason="set NURTUREHER_LIVE_EVAL=1 with approval to run")
def test_live_generation_quality_and_latency():
    import asyncio

    from app.services.gemini_service import GeminiService

    async def _run():
        service = GeminiService()
        assert service.api_key and service.api_key != "change-me", "live eval needs a real key"
        for lang, text in LIVE_CASES:
            started = time.monotonic()
            response = await service.generate_response(f"User message:\n{text}\n", lang)
            elapsed_ms = round((time.monotonic() - started) * 1000)
            print(f"[{lang}] latency_ms={elapsed_ms} chars={len(response)}")
            assert len(response) > 0

    asyncio.run(_run())
