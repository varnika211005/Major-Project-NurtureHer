"""P1: v1 safety-behaviour regression baseline.

These tests pin the CURRENT behaviour of app/services/safety.py so that any
future behaviour change diffs against them during review.

KNOWN BASELINE DEFICIENCIES (documented separately per approval — they are
NOT desired invariants, and later phases must fix them; each is covered by
an explicit test below so the gap stays visible):
  1. Other-harm intent (harming another person) is not detected.
  2. Romanized queries outside a tiny crisis-word list are not detected.
  3. Crisis/urgent templates are English-only.
  4. Negated crisis phrasing ("I don't want to die") still matches.
  5. Phrase lists need native-speaker and clinician review.
"""

from app.services.safety import (
    REVIEW_STATUS,
    SELF_HARM_PHRASES,
    TEMPLATE_VERSION,
    URGENT_MEDICAL_PHRASES,
    detect_urgent_symptoms,
    urgent_response,
)


def test_review_status_marks_templates_pending():
    assert REVIEW_STATUS == "pending-clinical-review"
    assert isinstance(TEMPLATE_VERSION, str) and TEMPLATE_VERSION


def test_self_harm_detected_across_scripts():
    assert detect_urgent_symptoms("I want to kill myself") == "self_harm"
    assert detect_urgent_symptoms("SUICIDE hotline? I need help") == "self_harm"
    assert detect_urgent_symptoms("मैं आत्महत्या के बारे में सोच रहा हूँ") == "self_harm"
    assert detect_urgent_symptoms("ನನಗೆ ಆತ್ಮಹತ್ಯೆ ಯೋಚನೆ ಬರುತ್ತಿದೆ") == "self_harm"
    assert detect_urgent_symptoms("எனக்கு தற்கொலை எண்ணம் உள்ளது") == "self_harm"
    assert detect_urgent_symptoms("నాకు ఆత్మహత్య ఆలోచనలు వస్తున్నాయి") == "self_harm"
    assert detect_urgent_symptoms("എനിക്ക് ആത്മഹത്യാ ചിന്തയുണ്ട്") == "self_harm"


def test_urgent_medical_detected_across_scripts():
    assert detect_urgent_symptoms("heavy bleeding after delivery") == "urgent_medical"
    assert detect_urgent_symptoms("I fainted and can't breathe") == "urgent_medical"
    assert detect_urgent_symptoms("बहुत खून बह रहा है") == "urgent_medical"
    assert detect_urgent_symptoms("ಭಾರೀ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ") == "urgent_medical"
    assert detect_urgent_symptoms("அதிக இரத்தப்போக்கு உள்ளது") == "urgent_medical"
    assert detect_urgent_symptoms("భారీ రక్తస్రావం అవుతోంది") == "urgent_medical"
    assert detect_urgent_symptoms("എനിക്ക് കനത്ത രക്തസ്രാവം ഉണ്ട്") == "urgent_medical"


def test_self_harm_takes_precedence():
    assert detect_urgent_symptoms("I fainted and I want to kill myself") == "self_harm"


def test_routine_questions_do_not_trigger():
    assert detect_urgent_symptoms("I feel tired, what foods give energy?") is None
    assert detect_urgent_symptoms("mild cramps during periods, is it normal?") is None
    assert detect_urgent_symptoms("") is None
    assert detect_urgent_symptoms(None) is None


def test_templates_contain_no_validation_claims():
    for body in (urgent_response("self_harm"), urgent_response("urgent_medical")):
        lowered = body.lower()
        assert "validat" not in lowered
        assert "approv" not in lowered
        assert "112" in body


def test_baseline_deficiency_other_harm_undetected():
    """Deficiency 1: harming another person is currently invisible to detection."""
    assert detect_urgent_symptoms("I want to hurt my husband") is None
    assert detect_urgent_symptoms("I feel like harming my baby") is None


def test_baseline_deficiency_romanized_gaps():
    """Deficiency 2: Romanized queries mostly fall through to None."""
    assert detect_urgent_symptoms("mujhe bahut tez bukhar hai") is None


def _has_indic_script(text: str) -> bool:
    return any(
        (0x0900 <= ord(ch) <= 0x097F) or (0x0B80 <= ord(ch) <= 0x0BFF) or (0x0C00 <= ord(ch) <= 0x0CFF) or (0x0D00 <= ord(ch) <= 0x0D7F)
        for ch in text
    )


def test_baseline_deficiency_templates_english_only():
    """Deficiency 3: templates carry no Indic-script content."""
    for body in (urgent_response("self_harm"), urgent_response("urgent_medical")):
        assert not _has_indic_script(body)


def test_baseline_deficiency_negation_not_handled():
    """Deficiency 4: denials still match crisis phrasing (safe direction)."""
    assert detect_urgent_symptoms("I don't want to die") == "self_harm"


def test_baseline_deficiency_lists_require_review():
    """Deficiency 5: phrase lists ship without native-speaker/clinician sign-off."""
    assert len(SELF_HARM_PHRASES) > 0
    assert len(URGENT_MEDICAL_PHRASES) > 0
    assert REVIEW_STATUS != "clinically-approved"
