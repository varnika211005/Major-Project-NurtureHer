"""Urgent-symptom and crisis safety layer for the chat pipeline.

Status: templates and phrase lists below are DRAFTS PENDING CLINICAL
REVIEW. They are not clinically validated and not production-approved.
Do not describe them as validated.

Design rules enforced here:
- Detection is a safety aid, not a diagnostic system. It never produces a
  diagnosis and never blocks care.
- Matching is intentionally narrow: routine symptom words on their own
  (tired, cramps, headache, fever) NEVER trigger. Only strong,
  multi-word or explicit crisis phrasing triggers.
- Known limitation (no negation handling): a denial such as "I don't want
  to die" still matches. This errs toward showing supportive crisis
  information rather than missing a crisis; it is documented, not fixed,
  because negation morphology differs across the six languages.
- Detection runs BEFORE retrieval/generation so urgent advice is never
  delayed by model calls.
- Phrase lists cover six languages but are initial and REQUIRE review by
  native speakers and a clinician; coverage gaps are documented in tests.
- Crisis templates are currently English-only (a wrong Indic crisis
  translation is more dangerous than English); localization of the
  templates themselves is explicit future work, not claimed support.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

REVIEW_STATUS = "pending-clinical-review"
TEMPLATE_VERSION = "safety-templates-v1"

SELF_HARM_PHRASES: tuple[str, ...] = (
    # English (includes common misspellings via substring matching)
    "suicide",
    "suicidal",
    "kill myself",
    "kill mysel",
    "kil myself",
    "kill myslef",
    "end my life",
    "end it all",
    "want to die",
    "wish i were dead",
    "wish i was dead",
    "harm myself",
    "hurt myself",
    "self-harm",
    "self harm",
    "take my own life",
    "don't want to live",
    "dont want to live",
    "no reason to live",
    "better off dead",
    # Romanized Hindi crisis phrasing
    "atmahatya",
    "marna chahta",
    "marna chahti",
    # Hindi
    "आत्महत्या",
    "खुद को मार",
    "मरना चाह",
    "जीने की इच्छा नहीं",
    "खुद को नुकसान",
    # Kannada
    "ಆತ್ಮಹತ್ಯೆ",
    "ಬದುಕಲು ಇಷ್ಟವಿಲ್ಲ",
    "ನನ್ನನ್ನು ಕೊಲ್ಲ",
    # Tamil
    "தற்கொலை",
    "சாக விரும்பு",
    "வாழ விருப்பமில்லை",
    # Telugu
    "ఆత్మహత్య",
    "చనిపోవాలని",
    "బతకాలని లేదు",
    # Malayalam
    "ആത്മഹത്യ",
    "ജീവിക്കാൻ താൽപ്പര്യമില്ല",
    "മരിച്ചാൽ മതി",
)

URGENT_MEDICAL_PHRASES: tuple[str, ...] = (
    # English
    "heavy bleeding",
    "bleeding heavily",
    "severe pain",
    "severe abdominal pain",
    "fainted",
    "fainting",
    "can't breathe",
    "cannot breathe",
    "difficulty breathing",
    "trouble breathing",
    "shortness of breath",
    "seizure",
    "seizures",
    "having fits",
    "high fever",
    "chest pain",
    "blurry vision",
    "vision changes",
    "severe headache",
    # Hindi
    "बहुत खून बह",
    "तेज दर्द",
    "बेहोश",
    "सांस नहीं",
    "मिरगी",
    "तेज बुखार",
    "सीने में दर्द",
    "धुंधला दिख",
    # Kannada
    "ಭಾರೀ ರಕ್ತಸ್ರಾವ",
    "ತೀವ್ರ ನೋವು",
    "ಮೂರ್ಛೆ",
    "ಉಸಿರಾಡಲು ಕಷ್ಟ",
    "ಫಿಟ್ಸ್",
    "ತೀವ್ರ ಜ್ವರ",
    "ಎದೆ ನೋವು",
    "ಮಂಜಾಗಿ",
    # Tamil
    "அதிக இரத்தப்போக்கு",
    "கடுமையான வலி",
    "மயங்கி விழு",
    "மூச்சுவிட முடியவில்லை",
    "வலிப்பு",
    "அதிக காய்ச்சல்",
    "நெஞ்சு வலி",
    "மங்கலான பார்வை",
    # Telugu
    "భారీ రక్తస్రావం",
    "తీవ్రమైన నొప్పి",
    "మూర్ఛ",
    "శ్వాస తీసుకోలే",
    "అధిక జ్వరం",
    "ఛాతీ నొప్పి",
    "మసకబారిన దృష్టి",
    # Malayalam
    "കനത്ത രക്തസ്രാവം",
    "കഠിനമായ വേദന",
    "ബോധക്ഷയം",
    "ബോധം പോയ",
    "ശ്വാസംമുട്ടൽ",
    "അപസ്മാരം",
    "കടുത്ത പനി",
    "നെഞ്ചുവേദന",
    "കാഴ്ച മങ്ങൽ",
)

SELF_HARM_TEMPLATE = (
    "If you feel you may act on thoughts of harming yourself, please reach "
    "out right now — to someone you trust, a clinician or counsellor, or "
    "your local emergency services. In India, you can call 112 for immediate "
    "emergency help. You deserve support, and you do not have to face this alone."
)

URGENT_MEDICAL_TEMPLATE = (
    "These symptoms can be warning signs that need urgent in-person care. "
    "Please seek emergency medical attention right away — in India, call 112 "
    "for immediate emergency help. Do not wait to see if they pass, and do "
    "not drive yourself if you feel faint or unwell."
)


def detect_urgent_symptoms(text: str | None) -> str | None:
    """Return "self_harm", "urgent_medical", or None.

    Pure substring matching on lowercased text. Self-harm is checked first
    so crisis language always takes precedence.
    """
    if not text:
        return None
    lowered = text.lower()
    for phrase in SELF_HARM_PHRASES:
        if phrase in lowered:
            return "self_harm"
    for phrase in URGENT_MEDICAL_PHRASES:
        if phrase in lowered:
            return "urgent_medical"
    return None


def urgent_response(kind: str) -> str:
    """Return the approved template for a detected kind.

    Templates carry no source-citation markers: the emergency path skips
    retrieval/generation by design, so no KB IDs are involved. Traceability
    comes from this module's REVIEW_STATUS and template version, logged by
    the caller without recording user text.
    """
    if kind == "self_harm":
        return SELF_HARM_TEMPLATE
    return URGENT_MEDICAL_TEMPLATE
