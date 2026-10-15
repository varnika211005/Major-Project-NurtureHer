LANGUAGE_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
}

REQUIRED_DISCLAIMER = "It may make mistakes, so please take care."


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


def build_insufficient_evidence_response(language: str) -> str:
    """Deterministic uncertainty response. No answer is invented; the caller
    appends the required disclaimer via ensure_disclaimer()."""
    return (
        "I don't have enough reliable information to answer that safely. "
        "Please consider discussing it with a qualified healthcare professional or doctor, "
        "who can give guidance based on your situation."
    )
