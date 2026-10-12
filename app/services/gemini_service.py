import logging
import re
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    # Models confirmed working for this API key account (tested 2026-09-02)
    _FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"]

    def __init__(self) -> None:
        self.api_key = (settings.gemini_api_key or "").strip("'\" \t\r\n")
        raw_model = (settings.gemini_model or "gemini-3.5-flash-lite").strip("'\" \t\r\n")
        # Map legacy/invalid model names to working equivalent
        if not raw_model or raw_model in ("gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"):
            self.model = "gemini-3.5-flash-lite"
        else:
            self.model = raw_model

    async def generate_response(self, prompt: str, language: str) -> str:
        if not self.api_key or self.api_key == "change-me":
            logger.warning("Gemini API key is not configured; using RAG clinical guidance response.")
            return self._fallback_response(prompt, language)

        # Build fallback chain: configured model first, then known-working alternatives
        models_to_try = [self.model] + [m for m in self._FALLBACK_MODELS if m != self.model]
        seen = set()

        for model_name in models_to_try:
            if model_name in seen:
                continue
            seen.add(model_name)

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 512},
            }
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    response = await client.post(url, params={"key": self.api_key}, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
            except Exception as exc:
                logger.warning("Gemini request failed with model %s: %s", model_name, exc)

        return self._fallback_response(prompt, language)

    def _fallback_response(self, prompt: str, language: str) -> str:
        retrieved_section = ""
        user_section = ""
        user_msg = ""

        retrieved_match = re.search(r"Retrieved medical education context:\n(.*?)(?=\n\n|\Z)", prompt, re.DOTALL)
        if retrieved_match:
            retrieved_section = retrieved_match.group(1).strip()

        user_match = re.search(r"User health context:\n(.*?)(?=\n\n|\Z)", prompt, re.DOTALL)
        if user_match:
            user_section = user_match.group(1).strip()

        msg_match = re.search(r"User message:\n(.*?)(?=\n\n|\Z)", prompt, re.DOTALL)
        if msg_match:
            user_msg = msg_match.group(1).strip()

        response_parts = []
        if language != "en":
            response_parts.append(f"**[{language.upper()} Care Response]**")

        response_parts.append("Here is clinical wellness and health guidance based on your query and medical record:\n")

        if retrieved_section:
            clean_docs = [line.lstrip("- ").strip() for line in retrieved_section.split("\n") if line.strip()]
            response_parts.append("### Key Clinical Recommendations")
            for doc in clean_docs:
                response_parts.append(f"- {doc}")

        if user_section:
            response_parts.append("\n### Personalized Care Record Context")
            for line in user_section.split("\n"):
                if line.strip():
                    response_parts.append(f"- **{line.strip()}**")

        response_parts.append("\n*Note: This information is for educational guidance. Please consult an ASHA worker or doctor for medical diagnosis or emergency care.*")
        response_parts.append("\nDo you have any specific symptoms or questions you'd like to discuss next?")

        return "\n".join(response_parts)
