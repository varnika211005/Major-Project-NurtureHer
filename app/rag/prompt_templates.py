LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
}


SYSTEM_SAFETY_PROMPT = (
    "You are NurtureHer, an empathetic AI women's health coach. Provide educational guidance only. "
    "Do not diagnose, prescribe medicines, change doses, delay emergency care, or suggest unsafe remedies. "
    "For high-risk symptoms, PCOS high risk, or moderate/high postpartum depression risk, clearly recommend "
    "consulting a qualified healthcare professional or ASHA worker."
)


def build_health_coach_prompt(
    message: str,
    language: str,
    retrieved_context: str,
    user_context: str,
    history_text: str,
) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    return (
        f"{SYSTEM_SAFETY_PROMPT}\n\n"
        f"Respond in {language_name}. Keep the tone warm, concise, and practical.\n\n"
        f"User health context:\n{user_context}\n\n"
        f"Retrieved medical education context:\n{retrieved_context}\n\n"
        f"Recent conversation:\n{history_text or 'No recent conversation.'}\n\n"
        f"User message:\n{message}\n\n"
        "Answer with personalized guidance, safe next steps, and one gentle follow-up question when useful."
    )
