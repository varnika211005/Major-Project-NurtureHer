"""P2 labeled relevance judgments for the embedding benchmark.

Provenance contract (enforced, not aspirational):
- `provisional=False` ONLY for English cases whose expected category comes
  from the established v1 eval set (`tests/test_chat_eval.py`).
- EVERY non-English and Romanized label was generated during implementation
  and is marked `provisional=True` until reviewed by native speakers. Report
  provisional-label metrics separately; never claim validated multilingual
  superiority on their basis.
- These judgments assert topical relevance (which document answers which
  query), never clinical validity.

Doc ids refer to the v1 knowledge-base entries (`app/rag/knowledge_base.py`).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LabeledCase:
    id: str
    language: str
    script: str  # "native" | "romanized"
    query: str
    relevant_doc_ids: tuple[str, ...] = ()
    provisional: bool = True


SAFETY = ("safety_urgent_001",)
PCOS = ("pcos_guidance_001",)
PPD = ("ppd_guidance_001",)
NUTRITION = ("nutrition_001",)
CYCLE = ("cycle_tracking_001",)
WELLNESS = ("mental_wellness_001",)

CASES: tuple[LabeledCase, ...] = (
    # --- English (established v1 labels; not provisional) ---
    LabeledCase("en-pcos-signs", "en", "native", "What are common signs of PCOS?", PCOS, provisional=False),
    LabeledCase(
        "en-pcos-limits",
        "en",
        "native",
        "Can irregular periods, acne and weight gain indicate PCOS?",
        PCOS,
        provisional=False,
    ),
    LabeledCase(
        "en-ppd-vs-blues",
        "en",
        "native",
        "How is baby blues different from postpartum depression?",
        PPD,
        provisional=False,
    ),
    LabeledCase(
        "en-urgent",
        "en",
        "native",
        "heavy bleeding after delivery, what should I do?",
        SAFETY,
        provisional=False,
    ),
    LabeledCase(
        "en-nutrition",
        "en",
        "native",
        "Which iron-rich foods help in pregnancy?",
        NUTRITION,
        provisional=False,
    ),
    LabeledCase(
        "en-cycle",
        "en",
        "native",
        "How do I track my menstrual cycle length?",
        CYCLE,
        provisional=False,
    ),
    # --- Kannada (provisional) ---
    LabeledCase("kn-pcos", "kn", "native", "ಪಿಸಿಓಎಸ್ ಲಕ್ಷಣಗಳು ಯಾವುವು?", PCOS),
    LabeledCase("kn-ppd", "kn", "native", "ಬೇಬಿ ಬ್ಲೂಸ್ ಮತ್ತು ಪ್ರಸವೋತ್ತರ ಖಿನ್ನತೆ ನಡುವಿನ ವ್ಯತ್ಯಾಸವೇನು?", PPD),
    LabeledCase("kn-urgent", "kn", "native", "ಹೆರಿಗೆಯ ನಂತರ ಭಾರೀ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ, ಏನು ಮಾಡಬೇಕು?", SAFETY),
    LabeledCase("kn-nutrition", "kn", "native", "ಗರ್ಭಾವಸ್ಥೆಯಲ್ಲಿ ಕಬ್ಬಿಣಾಂಶವಿರುವ ಆಹಾರಗಳು ಯಾವುವು?", NUTRITION),
    LabeledCase("kn-cycle", "kn", "native", "ನನ್ನ ಋತುಚಕ್ರದ ಅವಧಿಯನ್ನು ಹೇಗೆ ಟ್ರ್ಯಾಕ್ ಮಾಡುವುದು?", CYCLE),
    LabeledCase("kn-sleep", "kn", "native", "ಹೆರಿಗೆಯ ನಂತರ ನಿದ್ರೆ ಬರುತ್ತಿಲ್ಲ, ಏನು ಮಾಡಬೇಕು?", WELLNESS),
    # --- Hindi (provisional) ---
    LabeledCase("hi-pcos", "hi", "native", "पीसीओएस के लक्षण क्या हैं?", PCOS),
    LabeledCase("hi-ppd", "hi", "native", "प्रसव के बाद उदासी कब डॉक्टर को दिखानी चाहिए?", PPD),
    LabeledCase("hi-urgent", "hi", "native", "प्रसव के बाद भारी रक्तस्राव हो रहा है, क्या करूं?", SAFETY),
    LabeledCase("hi-nutrition", "hi", "native", "गर्भावस्था में आयरन से भरपूर खाद्य पदार्थ कौन से हैं?", NUTRITION),
    LabeledCase("hi-cycle", "hi", "native", "मैं अपने मासिक धर्म चक्र को कैसे ट्रैक करूं?", CYCLE),
    LabeledCase("hi-sleep", "hi", "native", "प्रसव के बाद नींद नहीं आती, क्या करूं?", WELLNESS),
    # --- Tamil (provisional) ---
    LabeledCase("ta-pcos", "ta", "native", "பிசிஓஎஸ் அறிகுறிகள் என்ன?", PCOS),
    LabeledCase("ta-ppd", "ta", "native", "பிரசவத்திற்குப் பிந்தைய மனச்சோர்வு எப்போது மருத்துவரைப் பார்க்க வேண்டும்?", PPD),
    LabeledCase("ta-urgent", "ta", "native", "பிரசவத்திற்குப் பிறகு அதிக இரத்தப்போக்கு, என்ன செய்ய வேண்டும்?", SAFETY),
    LabeledCase("ta-nutrition", "ta", "native", "கர்ப்ப காலத்தில் இரும்புச்சத்து நிறைந்த உணவுகள் எவை?", NUTRITION),
    LabeledCase("ta-cycle", "ta", "native", "எனது மாதவிடாய் சுழற்சியை எப்படிக் கண்காணிப்பது?", CYCLE),
    LabeledCase("ta-sleep", "ta", "native", "பிரசவத்திற்குப் பிறகு தூக்கம் வரவில்லை, என்ன செய்யலாம்?", WELLNESS),
    # --- Telugu (provisional) ---
    LabeledCase("te-pcos", "te", "native", "పిసిఓఎస్ లక్షణాలు ఏమిటి?", PCOS),
    LabeledCase("te-ppd", "te", "native", "ప్రసవం తర్వాత దిగులు ఎప్పుడు వైద్యుణ్ణి కలవాలి?", PPD),
    LabeledCase("te-urgent", "te", "native", "ప్రసవం తర్వాత భారీ రక్తస్రావం, ఏమి చేయాలి?", SAFETY),
    LabeledCase("te-nutrition", "te", "native", "గర్భంలో ఐరన్ ఉన్న ఆహారాలు ఏవి?", NUTRITION),
    LabeledCase("te-cycle", "te", "native", "నా రుతుచక్రాన్ని ఎలా ట్రాక్ చేయాలి?", CYCLE),
    LabeledCase("te-sleep", "te", "native", "ప్రసవం తర్వాత నిద్ర పట్టడం లేదు, ఏమి చేయాలి?", WELLNESS),
    # --- Malayalam (provisional) ---
    LabeledCase("ml-pcos", "ml", "native", "പിസിഒഎസ് ലക്ഷണങ്ങൾ എന്തൊക്കെ?", PCOS),
    LabeledCase("ml-ppd", "ml", "native", "പ്രസവശേഷം സങ്കടം തോന്നുമ്പോൾ എപ്പോൾ ഡോക്ടറെ കാണണം?", PPD),
    LabeledCase("ml-urgent", "ml", "native", "പ്രസവശേഷം കനത്ത രക്തസ്രാവം, എന്തുചെയ്യണം?", SAFETY),
    LabeledCase("ml-nutrition", "ml", "native", "ഗർഭകാലത്ത് ഇരുമ്പ് അടങ്ങിയ ഭക്ഷണങ്ങൾ ഏവ?", NUTRITION),
    LabeledCase("ml-cycle", "ml", "native", "എന്റെ ആർത്തവചക്രം എങ്ങനെ ട്രാക്ക് ചെയ്യും?", CYCLE),
    LabeledCase("ml-sleep", "ml", "native", "പ്രസവശേഷം ഉറക്കം വരുന്നില്ല, എന്തുചെയ്യണം?", WELLNESS),
    # --- Romanized (provisional) ---
    LabeledCase("roman-hi-sleep", "hi", "romanized", "mujhe neend nahi aati, what should I do?", WELLNESS),
    LabeledCase("roman-kn-tired", "kn", "romanized", "nanage sustagide, any tips?", WELLNESS),
    LabeledCase("roman-ta-sleep", "ta", "romanized", "enakku thookam varala, enna seiya?", WELLNESS),
    LabeledCase("roman-te-sleep", "te", "romanized", "niddura raavatledu, emi cheyali?", WELLNESS),
    # --- Irrelevant controls (relevance empty by construction) ---
    LabeledCase("irr-capital", "en", "native", "What is the capital of France?", ()),
    LabeledCase("irr-taxes", "en", "native", "How do I file my income taxes?", ()),
    LabeledCase("irr-phone", "en", "native", "Best smartphone under 20000 rupees", ()),
    LabeledCase("irr-quantum", "en", "native", "Explain quantum entanglement simply", ()),
)


def provisional_cases() -> list[LabeledCase]:
    return [c for c in CASES if c.provisional]


def established_cases() -> list[LabeledCase]:
    return [c for c in CASES if not c.provisional]
