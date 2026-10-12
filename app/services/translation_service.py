SUPPORTED_LANGUAGES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

LANGUAGE_KEYWORDS = {
    "kn": {"ನಾನು", "ಆರೋಗ್ಯ", "ನೋವು", "ಗರ್ಭ", "ಹೆಣ್ಣು"},
    "hi": {"मैं", "स्वास्थ्य", "दर्द", "गर्भ", "महिला"},
    "ta": {"நான்", "ஆரோக்கியம்", "வலி", "கர்ப்ப", "பெண்"},
    "te": {"నేను", "ఆరోగ్యం", "నొప్పి", "గర్భం", "మహిళ"},
    "ml": {"ഞാൻ", "ആരോഗ്യം", "വേദന", "ഗർഭം", "സ്ത്രീ"},
}


class TranslationService:
    def detect_language(self, text: str | None) -> str | None:
        if not text:
            return None
        scores = {language: 0 for language in LANGUAGE_KEYWORDS}
        for language, keywords in LANGUAGE_KEYWORDS.items():
            scores[language] += sum(1 for keyword in keywords if keyword in text)
        for character in text:
            codepoint = ord(character)
            if 0x0C80 <= codepoint <= 0x0CFF:
                scores["kn"] += 1
            elif 0x0900 <= codepoint <= 0x097F:
                scores["hi"] += 1
            elif 0x0B80 <= codepoint <= 0x0BFF:
                scores["ta"] += 1
            elif 0x0C00 <= codepoint <= 0x0C7F:
                scores["te"] += 1
            elif 0x0D00 <= codepoint <= 0x0D7F:
                scores["ml"] += 1
        detected, score = max(scores.items(), key=lambda item: item[1])
        return detected if score > 0 else None

    def normalize_language(self, language: str | None, fallback: str = "en") -> str:
        if language and language in SUPPORTED_LANGUAGES:
            return language
        return fallback if fallback in SUPPORTED_LANGUAGES else "en"

    async def translate_text(self, text: str, target_language: str) -> str:
        language = self.normalize_language(target_language)
        if language == "en":
            return text
        return f"[{language}] {text}"
