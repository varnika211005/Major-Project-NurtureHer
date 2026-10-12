import base64
import logging

from app.services.translation_service import TranslationService

logger = logging.getLogger(__name__)


class SpeechToTextService:
    async def transcribe(self, content: bytes, language: str) -> str:
        normalized_language = TranslationService().normalize_language(language)
        logger.info("Received voice input for STT: bytes=%s language=%s", len(content), normalized_language)
        return f"Voice message transcribed in {normalized_language}. Audio size: {len(content)} bytes."


class TextToSpeechService:
    async def synthesize(self, text: str, language: str) -> str:
        normalized_language = TranslationService().normalize_language(language)
        logger.info("Generating local TTS payload for language=%s", normalized_language)
        return base64.b64encode(f"[{normalized_language}] {text}".encode("utf-8")).decode("ascii")


class VoiceService:
    def __init__(self) -> None:
        self.stt = SpeechToTextService()
        self.tts = TextToSpeechService()

    async def transcribe(self, content: bytes, language: str) -> str:
        return await self.stt.transcribe(content, language)

    async def synthesize(self, text: str, language: str) -> str:
        return await self.tts.synthesize(text, language)
