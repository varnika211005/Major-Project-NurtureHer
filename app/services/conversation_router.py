"""Deterministic conversational routing for the chat coach.

Greetings, thanks, capability questions, and short emotional check-ins do
not need medical retrieval. Routing them before retrieval prevents a warm
message such as "hello" from being answered with a generic evidence-failure
notice. Medical-looking messages always bypass this router and stay on the
evidence-gated path; urgent/crisis detection runs even earlier in
``ChatbotService``.

The responses here are supportive, non-diagnostic, and deliberately contain
no clinical claims. Translations are drafts pending native-speaker review.
"""

from __future__ import annotations

import re
from enum import Enum

REVIEW_STATUS = "pending-native-review"


class ConversationalIntent(str, Enum):
    GREETING = "greeting"
    THANKS = "thanks"
    EMOTIONAL_CHECKIN = "emotional_checkin"
    CAPABILITIES = "capabilities"


_GREETINGS = {
    "hi",
    "hii",
    "hello",
    "hey",
    "hey there",
    "hello there",
    "hi there",
    "good morning",
    "good afternoon",
    "good evening",
    "namaste",
    "namaskar",
    "namaskara",
    "vanakkam",
    "namaskaram",
    "नमस्ते",
    "नमस्कार",
    "हैलो",
    "हाय",
    "सुप्रभात",
    "ನಮಸ್ಕಾರ",
    "ಹಲೋ",
    "ಹಾಯ್",
    "ಶುಭೋದಯ",
    "வணக்கம்",
    "ஹலோ",
    "ஹாய்",
    "காலை வணக்கம்",
    "నమస్కారం",
    "హలో",
    "హాయ్",
    "శుభోదయం",
    "നമസ്കാരം",
    "ഹലോ",
    "ഹായ്",
    "സുപ്രഭാതം",
}

_THANKS = {
    "thanks",
    "thank you",
    "thank u",
    "thanks a lot",
    "thanks so much",
    "thank you so much",
    "thankyou",
    "dhanyavaad",
    "dhanyavad",
    "धन्यवाद",
    "शुक्रिया",
    "थैंक्स",
    "थैंक यू",
    "ಧನ್ಯವಾದ",
    "ಥ್ಯಾಂಕ್ಸ್",
    "நன்றி",
    "ధన్యవాదాలు",
    "థ్యాంక్స్",
    "നന്ദി",
    "താങ്ക്സ്",
}

_CAPABILITY_PHRASES = (
    "what can you do",
    "what do you do",
    "who are you",
    "how can you help",
    "how do you help",
    "what can i ask",
    "what can i ask you",
    "what are you",
    "आप क्या कर सकती हैं",
    "आप कौन हैं",
    "आप कैसे मदद कर सकती हैं",
    "ನೀವು ಏನು ಮಾಡಬಹುದು",
    "ನೀವು ಯಾರು",
    "நீங்கள் என்ன செய்ய முடியும்",
    "நீங்கள் யார்",
    "మీరు ఏమి చేయగలరు",
    "మీరు ఎవరు",
    "നിങ്ങൾക്ക് എന്ത് ചെയ്യാനാകും",
    "നിങ്ങൾ ആരാണ്",
)

_EMOTIONAL_PHRASES = (
    "i feel sad",
    "i'm sad",
    "i am sad",
    "feeling sad",
    "i feel low",
    "i feel down",
    "i feel anxious",
    "i'm anxious",
    "i am anxious",
    "i feel worried",
    "i'm worried",
    "i feel overwhelmed",
    "i'm overwhelmed",
    "i feel lonely",
    "i'm lonely",
    "i feel alone",
    "i'm alone",
    "i feel stressed",
    "i'm stressed",
    "i feel drained",
    "i feel exhausted",
    "i'm exhausted",
    "i feel empty",
    "i feel numb",
    "i feel like crying",
    "i want to cry",
    "i don't know what to do",
    "i need support",
    "i want to talk",
    "मैं उदास",
    "मुझे उदासी",
    "उदास",
    "मैं चिंतित",
    "मुझे चिंता",
    "चिंतित",
    "मैं अकेला",
    "मैं अकेली",
    "अकेल",
    "मैं तनाव में",
    "तनाव",
    "मैं थक गई",
    "थक",
    "रोना आ रहा",
    "रोना",
    "मन नहीं लग रहा",
    "कुछ समझ नहीं आ रहा",
    "ನನಗೆ ದುಃಖ",
    "ನಾನು ದುಃಖ",
    "ದುಃಖ",
    "ನನಗೆ ಆತಂಕ",
    "ಆತಂಕ",
    "ನಾನು ಒಂಟಿ",
    "ಒಂಟಿ",
    "ನಾನು ಒತ್ತಡ",
    "ಒತ್ತಡ",
    "ಸುಸ್ತಾಗಿದೆ",
    "ಸುಸ್ತ",
    "ಅಳು ಬರುತ್ತಿದೆ",
    "ಅಳು",
    "ಮನಸ್ಸು ಸರಿ ಇಲ್ಲ",
    "எனக்கு வருத்தம்",
    "நான் வருத்த",
    "வருத்த",
    "எனக்கு கவலை",
    "கவலை",
    "நான் தனிமை",
    "தனிமை",
    "நான் மன அழுத்த",
    "அழுத்த",
    "சோர்வாக",
    "சோர்வ",
    "அழுகை வருகிறது",
    "அழுகை",
    "மனசு சரியில்லை",
    "నాకు బాధ",
    "నేను బాధ",
    "బాధ",
    "నాకు ఆందోళన",
    "ఆందోళన",
    "నేను ఒంటరి",
    "ఒంటరి",
    "నేను ఒత్తిడి",
    "ఒత్తిడి",
    "అలసట",
    "అలస",
    "ఏడుపు వస్తోంది",
    "ఏడుపు",
    "మనసు బాగా లేదు",
    "എനിക്ക് സങ്കടം",
    "ഞാൻ സങ്കട",
    "സങ്കട",
    "എനിക്ക് ഉത്കണ്ഠ",
    "ഉത്കണ്ഠ",
    "ഞാൻ ഒറ്റയ്ക്ക",
    "ഒറ്റയ്ക്ക",
    "ഞാൻ സമ്മർദ",
    "സമ്മർദ",
    "ക്ഷീണ",
    "കരയാൻ തോന്നുന്നു",
    "കരയ",
    "മനസ്സ് ശരിയല്ല",
)

_MEDICAL_TERMS = (
    "pcos",
    "pcod",
    "pregnan",
    "postpartum",
    "postnatal",
    "breastfeed",
    "period",
    "menstrual",
    "cycle",
    "bleed",
    "pain",
    "fever",
    "symptom",
    "medicine",
    "medication",
    "tablet",
    "dose",
    "dosage",
    "treatment",
    "diagnos",
    "doctor",
    "hospital",
    "test result",
    "report",
    "infection",
    "thyroid",
    "diabetes",
    "blood pressure",
    "गर्भ",
    "मासिक",
    "दर्द",
    "दवा",
    "डॉक्टर",
    "बुखार",
    "ಗರ್ಭ",
    "ಋತು",
    "ನೋವು",
    "ಔಷಧ",
    "ವೈದ್ಯ",
    "ಜ್ವರ",
    "கர்ப்ப",
    "மாதவிடாய",
    "வலி",
    "மருந்து",
    "மருத்துவ",
    "காய்ச்ச",
    "గర్భ",
    "రుతు",
    "నొప్పి",
    "మందు",
    "వైద్య",
    "జ్వరం",
    "ഗർഭ",
    "ആർത്തവ",
    "വേദന",
    "മരുന്ന",
    "ഡോക്ടർ",
    "പനി",
)

_RESPONSES: dict[str, dict[ConversationalIntent, str]] = {
    "en": {
        ConversationalIntent.GREETING: (
            "Hello, I'm here with you. How are you feeling today? You can ask me about your health, "
            "nutrition, cycle, or emotional wellbeing."
        ),
        ConversationalIntent.THANKS: (
            "You're very welcome. I'm glad I could help. Take care of yourself, and come back anytime."
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "I'm here with you. It sounds like you're carrying something difficult right now. If you'd like, "
            "tell me what's been on your mind, or we can start with one small step that feels manageable."
        ),
        ConversationalIntent.CAPABILITIES: (
            "I can share educational information about pregnancy, postpartum recovery, cycles, nutrition, PCOS, "
            "and emotional wellbeing. I can't diagnose or prescribe. What would you like to talk about?"
        ),
    },
    "hi": {
        ConversationalIntent.GREETING: (
            "नमस्ते, मैं आपके साथ हूँ। आज आप कैसा महसूस कर रही हैं? आप अपनी सेहत, पोषण, मासिक धर्म "
            "या भावनात्मक स्वास्थ्य के बारे में पूछ सकती हैं।"
        ),
        ConversationalIntent.THANKS: (
            "आपका स्वागत है। मुझे मदद करके अच्छा लगा। अपना ध्यान रखें, और जब भी ज़रूरत हो वापस आएं।"
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "मैं आपके साथ हूँ। ऐसा लगता है कि अभी आप कुछ कठिन स्थिति से गुजर रही हैं। अगर चाहें तो बताएं कि "
            "मन में क्या है, या हम किसी एक छोटे और आसान कदम से शुरुआत कर सकते हैं।"
        ),
        ConversationalIntent.CAPABILITIES: (
            "मैं गर्भावस्था, प्रसव के बाद की देखभाल, मासिक धर्म, पोषण, PCOS और भावनात्मक स्वास्थ्य के बारे में "
            "शैक्षिक जानकारी दे सकती हूँ। मैं निदान या दवा नहीं बता सकती। आप किस बारे में बात करना चाहेंगी?"
        ),
    },
    "kn": {
        ConversationalIntent.GREETING: (
            "ನಮಸ್ಕಾರ, ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ. ಇಂದು ನೀವು ಹೇಗೆ ಅನುಭವಿಸುತ್ತಿದ್ದೀರಿ? ನಿಮ್ಮ ಆರೋಗ್ಯ, ಪೋಷಣೆ, "
            "ಋತುಚಕ್ರ ಅಥವಾ ಭಾವನಾತ್ಮಕ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಕೇಳಬಹುದು."
        ),
        ConversationalIntent.THANKS: (
            "ನಿಮಗೆ ಸ್ವಾಗತ. ಸಹಾಯ ಮಾಡಲು ಸಂತೋಷವಾಗಿದೆ. ನಿಮ್ಮ ಆರೈಕೆ ಮಾಡಿಕೊಳ್ಳಿ, ಯಾವಾಗ ಬೇಕಾದರೂ ಮತ್ತೆ ಬನ್ನಿ."
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "ನಾನು ನಿಮ್ಮೊಂದಿಗಿದ್ದೇನೆ. ಈಗ ನೀವು ಏನೋ ಕಷ್ಟಕರ ಪರಿಸ್ಥಿತಿಯನ್ನು ಅನುಭವಿಸುತ್ತಿದ್ದೀರಿ ಎನಿಸುತ್ತದೆ. "
            "ಇಷ್ಟವಾದರೆ ನಿಮ್ಮ ಮನಸ್ಸಿನಲ್ಲಿರುವುದನ್ನು ಹೇಳಿ, ಅಥವಾ ನಮಗೆ ಸಾಧ್ಯವಾದ ಒಂದು ಸಣ್ಣ ಹೆಜ್ಜೆಯಿಂದ ಪ್ರಾರಂಭಿಸಬಹುದು."
        ),
        ConversationalIntent.CAPABILITIES: (
            "ಗರ್ಭಾವಸ್ಥೆ, ಹೆರಿಗೆಯ ನಂತರದ ಆರೈಕೆ, ಋತುಚಕ್ರ, ಪೋಷಣೆ, PCOS ಮತ್ತು ಭಾವನಾತ್ಮಕ ಆರೋಗ್ಯದ ಬಗ್ಗೆ "
            "ಶೈಕ್ಷಣಿಕ ಮಾಹಿತಿ ನೀಡಬಲ್ಲೆ. ನಾನು ರೋಗನಿರ್ಣಯ ಅಥವಾ ಔಷಧ ಸೂಚಿಸಲಾರೆ. ನೀವು ಯಾವ ವಿಷಯದ ಬಗ್ಗೆ ಮಾತನಾಡಲು ಬಯಸುತ್ತೀರಿ?"
        ),
    },
    "ta": {
        ConversationalIntent.GREETING: (
            "வணக்கம், நான் உங்களுடன் இருக்கிறேன். இன்று நீங்கள் எப்படி உணர்கிறீர்கள்? உங்கள் உடல்நலம், "
            "ஊட்டச்சத்து, மாதவிடாய் சுழற்சி அல்லது உணர்வு நலம் பற்றி கேட்கலாம்."
        ),
        ConversationalIntent.THANKS: (
            "மிக்க நன்றி. உதவ முடிந்ததில் மகிழ்ச்சி. உங்களை நன்றாக பராமரித்துக் கொள்ளுங்கள், "
            "எப்போது வேண்டுமானாலும் மீண்டும் வாருங்கள்."
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "நான் உங்களுடன் இருக்கிறேன். இப்போது நீங்கள் ஏதோ கடினமான ஒன்றை அனுபவிக்கிறீர்கள் என்று தோன்றுகிறது. "
            "விரும்பினால் மனதில் இருப்பதைச் சொல்லுங்கள், அல்லது நமக்கு சாத்தியமான ஒரு சிறிய படியிலிருந்து தொடங்கலாம்."
        ),
        ConversationalIntent.CAPABILITIES: (
            "கர்ப்பம், பிரசவத்திற்குப் பின் பராமரிப்பு, மாதவிடாய் சுழற்சி, ஊட்டச்சத்து, PCOS மற்றும் உணர்வு நலம் "
            "பற்றிய கல்வித் தகவல்களை வழங்க முடியும். நான் நோயறிதல் அல்லது மருந்து பரிந்துரை செய்ய முடியாது. "
            "எதைப் பற்றி பேச விரும்புகிறீர்கள்?"
        ),
    },
    "te": {
        ConversationalIntent.GREETING: (
            "నమస్కారం, నేను మీతో ఉన్నాను. ఈరోజు మీరు ఎలా అనుభవిస్తున్నారు? మీ ఆరోగ్యం, పోషణ, రుతుచక్రం "
            "లేదా భావోద్వేగ ఆరోగ్యం గురించి అడగవచ్చు."
        ),
        ConversationalIntent.THANKS: (
            "మీకు స్వాగతం. సహాయం చేయగలిగినందుకు సంతోషం. మీ ఆరోగ్యాన్ని జాగ్రత్తగా చూసుకోండి, "
            "ఎప్పుడైనా తిరిగి రండి."
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "నేను మీతో ఉన్నాను. ఇప్పుడు మీరు ఏదో కష్టమైన పరిస్థితిని ఎదుర్కొంటున్నట్లు అనిపిస్తుంది. "
            "కావాలంటే మనసులో ఉన్నది చెప్పండి, లేదా మనకు సాధ్యమయ్యే ఒక చిన్న అడుగుతో ప్రారంభించవచ్చు."
        ),
        ConversationalIntent.CAPABILITIES: (
            "గర్భధారణ, ప్రసవానంతర సంరక్షణ, రుతుచక్రం, పోషణ, PCOS మరియు భావోద్వేగ ఆరోగ్యం గురించి "
            "విద్యాపరమైన సమాచారం అందించగలను. నేను నిర్ధారణ లేదా మందులు సూచించలేను. "
            "మీరు ఏమి గురించి మాట్లాడాలనుకుంటున్నారు?"
        ),
    },
    "ml": {
        ConversationalIntent.GREETING: (
            "നമസ്കാരം, ഞാൻ നിങ്ങളോടൊപ്പമുണ്ട്. ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെ തോന്നുന്നു? നിങ്ങളുടെ ആരോഗ്യം, "
            "പോഷകാഹാരം, ആർത്തവചക്രം അല്ലെങ്കിൽ മാനസിക ആരോഗ്യത്തെക്കുറിച്ച് ചോദിക്കാം."
        ),
        ConversationalIntent.THANKS: (
            "നിങ്ങൾക്ക് സ്വാഗതം. സഹായിക്കാനായതിൽ സന്തോഷം. നിങ്ങളെ നന്നായി പരിപാലിക്കുക, "
            "എപ്പോൾ വേണമെങ്കിലും വീണ്ടും വരാം."
        ),
        ConversationalIntent.EMOTIONAL_CHECKIN: (
            "ഞാൻ നിങ്ങളോടൊപ്പമുണ്ട്. ഇപ്പോൾ നിങ്ങൾ എന്തോ ബുദ്ധിമുട്ടുള്ള കാര്യം അനുഭവിക്കുന്നതായി തോന്നുന്നു. "
            "താൽപ്പര്യമുണ്ടെങ്കിൽ മനസ്സിലുള്ളത് പറയൂ, അല്ലെങ്കിൽ നമുക്ക് ചെയ്യാനാകുന്ന ഒരു ചെറിയ ചുവടുവെപ്പിൽ "
            "നിന്ന് തുടങ്ങാം."
        ),
        ConversationalIntent.CAPABILITIES: (
            "ഗർഭകാലം, പ്രസവാനന്തര പരിചരണം, ആർത്തവചക്രം, പോഷകാഹാരം, PCOS, മാനസിക ആരോഗ്യം എന്നിവയെക്കുറിച്ച് "
            "വിദ്യാഭ്യാസപരമായ വിവരങ്ങൾ നൽകാം. എനിക്ക് രോഗനിർണയമോ മരുന്ന് നിർദേശമോ നൽകാനാവില്ല. "
            "എന്തിനെക്കുറിച്ചാണ് സംസാരിക്കാൻ ആഗ്രഹിക്കുന്നത്?"
        ),
    },
}


def _normalize(text: str) -> str:
    lowered = text.casefold().strip()
    cleaned = re.sub(r"[!?.,;:…]+", " ", lowered)
    return re.sub(r"\s+", " ", cleaned).strip()


def _has_medical_terms(normalized: str) -> bool:
    return any(term in normalized for term in _MEDICAL_TERMS)


def classify_conversational_intent(text: str | None) -> ConversationalIntent | None:
    """Return a conversational intent only when safe to skip retrieval.

    Exact greetings/thanks/capability questions are intentionally narrow.
    Short emotional check-ins are matched by phrase, but any message that
    also looks like a medical question stays on the evidence-gated path.
    """
    if not text or not text.strip():
        return None
    normalized = _normalize(text)
    if not normalized:
        return None

    if normalized in _GREETINGS:
        return ConversationalIntent.GREETING
    if normalized in _THANKS:
        return ConversationalIntent.THANKS
    if _has_medical_terms(normalized):
        return None
    if any(phrase in normalized for phrase in _CAPABILITY_PHRASES):
        return ConversationalIntent.CAPABILITIES
    if any(phrase in normalized for phrase in _EMOTIONAL_PHRASES):
        return ConversationalIntent.EMOTIONAL_CHECKIN
    return None


def conversational_response(intent: ConversationalIntent, language: str) -> str:
    """Return the localized, non-diagnostic template for an intent."""
    by_language = _RESPONSES.get(language) or _RESPONSES["en"]
    return by_language[intent]
