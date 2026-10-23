LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

REQUIRED_DISCLAIMER = "It may make mistakes, so please take care."

INSUFFICIENT_EVIDENCE_RESPONSES = {
    "en": (
        "I don't have enough reliable information to answer that safely. "
        "Please consider discussing it with a qualified healthcare professional or doctor, "
        "who can give guidance based on your situation."
    ),
    "hi": (
        "मेरे पास इसका सुरक्षित उत्तर देने के लिए पर्याप्त विश्वसनीय जानकारी नहीं है। "
        "कृपया अपनी स्थिति के अनुसार मार्गदर्शन के लिए किसी योग्य स्वास्थ्य पेशेवर या डॉक्टर से "
        "बात करने पर विचार करें।"
    ),
    "kn": (
        "ಸುರಕ್ಷಿತವಾಗಿ ಉತ್ತರಿಸಲು ನನ್ನ ಬಳಿ ಸಾಕಷ್ಟು ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ ಇಲ್ಲ. "
        "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಗೆ ಅನುಗುಣವಾದ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರು ಅಥವಾ "
        "ವೈದ್ಯರೊಂದಿಗೆ ಮಾತನಾಡುವುದನ್ನು ಪರಿಗಣಿಸಿ."
    ),
    "ta": (
        "பாதுகாப்பாக பதிலளிக்க என்னிடம் போதுமான நம்பகமான தகவல் இல்லை. "
        "உங்கள் நிலைக்கு ஏற்ற வழிகாட்டலுக்காக தகுதியான சுகாதார நிபுணர் அல்லது மருத்துவரிடம் "
        "பேசுவதைப் பரிசீலிக்கவும்."
    ),
    "te": (
        "సురక్షితంగా సమాధానం ఇవ్వడానికి నా దగ్గర తగినంత నమ్మకమైన సమాచారం లేదు. "
        "మీ పరిస్థితికి తగిన మార్గదర్శనం కోసం అర్హత కలిగిన ఆరోగ్య నిపుణుడు లేదా వైద్యుడిని "
        "సంప్రదించడాన్ని పరిగణించండి."
    ),
    "ml": (
        "സുരക്ഷിതമായി ഉത്തരം നൽകാൻ ആവശ്യമായ വിശ്വസനീയ വിവരങ്ങൾ എന്റെ പക്കൽ ഇല്ല. "
        "നിങ്ങളുടെ സാഹചര്യത്തിന് അനുയോജ്യമായ മാർഗനിർദേശത്തിനായി യോഗ്യതയുള്ള ആരോഗ്യ വിദഗ്ധനെയോ "
        "ഡോക്ടറെയോ സമീപിക്കുന്നത് പരിഗണിക്കുക."
    ),
}

AMBIGUOUS_EVIDENCE_RESPONSES = {
    "en": (
        "I want to make sure I point you to the right information. Could you tell me a little more "
        "about what you're experiencing or what you'd like to know?"
    ),
    "hi": (
        "मैं सही जानकारी तक पहुँचना चाहती हूँ। कृपया थोड़ा और बताएं कि आप क्या महसूस कर रही हैं "
        "या क्या जानना चाहती हैं।"
    ),
    "kn": (
        "ನಾನು ಸರಿಯಾದ ಮಾಹಿತಿಯನ್ನು ತಲುಪಲು ಬಯಸುತ್ತೇನೆ. ನೀವು ಏನನ್ನು ಅನುಭವಿಸುತ್ತಿದ್ದೀರಿ ಅಥವಾ "
        "ಏನನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಹೇಳಿ."
    ),
    "ta": (
        "சரியான தகவலை உங்களுக்கு வழங்க விரும்புகிறேன். நீங்கள் எதை அனுபவிக்கிறீர்கள் அல்லது "
        "என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள் என்பதைச் சற்று மேலும் கூறுங்கள்."
    ),
    "te": (
        "సరైన సమాచారాన్ని అందించాలనుకుంటున్నాను. మీరు ఏమి అనుభవిస్తున్నారో లేదా ఏమి "
        "తెలుసుకోవాలనుకుంటున్నారో కొంచెం ఎక్కువ చెప్పండి."
    ),
    "ml": (
        "ശരിയായ വിവരം നൽകാൻ ഞാൻ ആഗ്രഹിക്കുന്നു. നിങ്ങൾ എന്താണ് അനുഭവിക്കുന്നത് അല്ലെങ്കിൽ "
        "എന്താണ് അറിയാൻ ആഗ്രഹിക്കുന്നത് എന്ന് അൽപ്പം കൂടി പറയാമോ?"
    ),
}


def ensure_disclaimer(response: str) -> str:
    """Append the required disclaimer exactly once.

    Idempotent: if the exact sentence is already present, the response is
    returned unchanged. This keeps retries and reformats from duplicating it.
    """
    if not response:
        return REQUIRED_DISCLAIMER
    if REQUIRED_DISCLAIMER in response:
        return response
    separator = "" if response.endswith("\n") else "\n"
    return f"{response}{separator}{REQUIRED_DISCLAIMER}"


SYSTEM_SAFETY_PROMPT = (
    "You are NurtureHer, an empathetic AI women's health coach. Provide educational guidance only. "
    "Do not diagnose, prescribe medicines, change doses, delay emergency care, or suggest unsafe remedies. "
    "For high-risk symptoms, PCOS high risk, or moderate/high postpartum depression risk, clearly recommend "
    "consulting a qualified healthcare professional or doctor."
)


def build_health_coach_prompt(
    message: str,
    language: str,
    retrieved_context: str,
    user_context: str,
    history_text: str,
    cited_ids: tuple[str, ...] = (),
) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    citation_rule = (
        "When you use information from the retrieved context, cite it inline as "
        "[source:<id>] using only these IDs that were actually retrieved: "
        + (", ".join(cited_ids) if cited_ids else "(none — no verified sources were retrieved, so cite nothing)")
        + ". Never invent citation IDs, URLs, publication dates, or issuing organizations."
    )
    return (
        f"{SYSTEM_SAFETY_PROMPT}\n\n"
        f"Respond in {language_name}. Keep the tone warm, concise, and practical.\n\n"
        f"User health context:\n{user_context}\n\n"
        f"Retrieved medical education context:\n{retrieved_context}\n\n"
        f"Recent conversation:\n{history_text or 'No recent conversation.'}\n\n"
        f"User message:\n{message}\n\n"
        f"{citation_rule}\n"
        "Answer with personalized guidance, safe next steps, and one gentle follow-up question when useful."
    )


def _localized_response(templates: dict[str, str], language: str) -> str:
    return templates.get(language) or templates["en"]


def build_insufficient_evidence_response(language: str = "en") -> str:
    """Deterministic uncertainty response. No answer is invented; the caller
    appends the required disclaimer via ensure_disclaimer()."""
    return _localized_response(INSUFFICIENT_EVIDENCE_RESPONSES, language)


def build_ambiguous_evidence_response(language: str = "en") -> str:
    """Ask for clarification without offering medical advice or facts."""
    return _localized_response(AMBIGUOUS_EVIDENCE_RESPONSES, language)
