from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Cycle, Mood, Symptom
from app.rag.prompt_templates import LANGUAGE_NAMES
from app.rag.retriever import HealthKnowledgeRetriever


_PREGNANCY_TERMS = (
    "pregnan",
    "antenatal",
    "trimester",
    "postpartum",
    "postnatal",
    "delivery",
    "breastfeed",
    "baby",
    "newborn",
    "गर्भ",
    "प्रसव",
    "डिलीवरी",
    "ಗರ್ಭ",
    "ಹೆರಿಗೆ",
    "ಸ್ತನ್ಯ",
    "கர்ப்ப",
    "பிரசவ",
    "గర్భ",
    "ప్రసవ",
    "ഗർഭ",
    "പ്രസവ",
    "മുലയൂട്ട",
)

_CYCLE_TERMS = (
    "cycle",
    "period",
    "menstrual",
    "pcos",
    "pcod",
    "ovulat",
    "irregular",
    "मासिक",
    "पीसीओएस",
    "ಋತು",
    "ಪಿಸಿಒಎಸ್",
    "மாதவிடாய",
    "பிசிஓஎஸ்",
    "రుతు",
    "పీసీఓఎస్",
    "ആർത്തവ",
    "പിസിഒഎസ്",
)

_MOOD_TERMS = (
    "mood",
    "sad",
    "anxious",
    "anxiety",
    "stress",
    "depress",
    "emotional",
    "lonely",
    "cry",
    "overwhelm",
    "उदास",
    "चिंता",
    "तनाव",
    "ದುಃಖ",
    "ಆತಂಕ",
    "வருத்த",
    "கவலை",
    "బాధ",
    "ఆందోళన",
    "സങ്കട",
    "ഉത്കണ്ഠ",
)

_SYMPTOM_TERMS = (
    "symptom",
    "pain",
    "tired",
    "fatigue",
    "headache",
    "cramp",
    "nausea",
    "vomit",
    "dizzy",
    "bleed",
    "fever",
    "sleep",
    "दर्द",
    "थकान",
    "बुखार",
    "ನೋವು",
    "ಆಯಾಸ",
    "ಜ್ವರ",
    "வலி",
    "சோர்வ",
    "காய்ச்ச",
    "నొప్పి",
    "అలస",
    "జ్వరం",
    "വേദന",
    "ക്ഷീണ",
    "പനി",
)

_NUTRITION_TERMS = (
    "nutrition",
    "diet",
    "eat",
    "food",
    "meal",
    "पोषण",
    "खान",
    "ಆಹಾರ",
    "உணவ",
    "ఆహార",
    "ഭക്ഷണ",
)

_PCOS_TERMS = ("pcos", "pcod", "पीसीओएस", "ಪಿಸಿಒಎಸ್", "பிசிஓஎஸ்", "పీసీఓఎస్", "പിസിഒഎസ്")

_PPD_TERMS = (
    "postpartum",
    "postnatal",
    "epds",
    "depress",
    "baby",
    "breastfeed",
    "प्रसव",
    "डिलीवरी",
    "ಹೆರಿಗೆ",
    "பிரசவ",
    "ప్రసవ",
    "പ്രസവ",
)


def _mentions(text: str, terms: tuple[str, ...]) -> bool:
    for term in terms:
        if term.isascii():
            if re.search(rf"\b{re.escape(term)}", text):
                return True
        elif term in text:
            return True
    return False


class HealthContextBuilder:
    def __init__(self, db: AsyncSession | None = None) -> None:
        self.db = db
        self.retriever = HealthKnowledgeRetriever()
        self.last_diagnostics = None

    async def build(self, user: User, message: str, language: str) -> tuple[str, str, tuple[str, ...]]:
        retrieved_context, cited_ids = self._format_retrieved_context(message)
        user_context = await self._build_user_context(user, language, message)
        return retrieved_context, user_context, cited_ids

    def _format_retrieved_context(self, message: str) -> tuple[str, tuple[str, ...]]:
        result = self.retriever.retrieve(message)
        self.last_diagnostics = result.diagnostics
        text = "\n".join(
            f"- [{item.document.metadata.get('id')}] {item.document.metadata.get('title')}: " f"{item.document.page_content}"
            for item in result.documents
        )
        return text, result.cited_ids

    async def _build_user_context(self, user: User, language: str, message: str | None = None) -> str:
        """Build the minimum authorized context needed for this question.

        Location is intentionally never injected into general chat. Profile
        rows are queried by the authenticated user's id and only fields
        relevant to the message are included.
        """
        text = (message or "").casefold()
        wants_pregnancy = _mentions(text, _PREGNANCY_TERMS) or _mentions(text, _NUTRITION_TERMS)
        wants_cycle = _mentions(text, _CYCLE_TERMS)
        wants_pcos = _mentions(text, _PCOS_TERMS)
        wants_ppd = _mentions(text, _PPD_TERMS)
        wants_mood = _mentions(text, _MOOD_TERMS)
        wants_symptoms = _mentions(text, _SYMPTOM_TERMS)

        lines = [f"Preferred language: {LANGUAGE_NAMES.get(language, language)}"]
        if self.db is None:
            return "\n".join(lines)

        profile = await self.db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
        if profile:
            if wants_pregnancy and profile.pregnancy_status:
                lines.append(f"Pregnancy status: {profile.pregnancy_status}")
            if wants_pregnancy and profile.delivery_date:
                lines.append(f"Delivery date: {profile.delivery_date.isoformat()}")
            if (wants_pregnancy or wants_cycle) and profile.age:
                lines.append(f"Age: {profile.age}")

        if wants_mood:
            latest_mood = await self.db.scalar(
                select(Mood).where(Mood.user_id == user.id).order_by(Mood.created_at.desc()).limit(1)
            )
            if latest_mood:
                lines.append(f"Latest mood: {latest_mood.mood.value}")

        if wants_symptoms:
            latest_symptoms = await self.db.scalar(
                select(Symptom).where(Symptom.user_id == user.id).order_by(Symptom.created_at.desc()).limit(1)
            )
            if latest_symptoms:
                active_symptoms = [
                    name
                    for name, active in {
                        "fatigue": latest_symptoms.fatigue,
                        "headache": latest_symptoms.headache,
                        "sleep issue": latest_symptoms.sleep_issue,
                        "anxiety": latest_symptoms.anxiety,
                        "cramps": latest_symptoms.cramps,
                    }.items()
                    if active
                ]
                lines.append(f"Latest symptoms: {', '.join(active_symptoms) if active_symptoms else 'none reported'}")

        if wants_cycle:
            latest_cycle = await self.db.scalar(
                select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.created_at.desc()).limit(1)
            )
            if latest_cycle:
                lines.append(f"Next cycle estimate: {latest_cycle.next_period_prediction.isoformat()}")

        if wants_pcos or wants_cycle:
            latest_pcos = await self.db.scalar(
                select(PCOSPrediction).where(PCOSPrediction.user_id == user.id).order_by(PCOSPrediction.created_at.desc()).limit(1)
            )
            if latest_pcos:
                lines.append(f"Latest PCOS risk: {latest_pcos.risk_level.value} ({latest_pcos.probability:.0%})")

        if wants_ppd or wants_mood:
            latest_ppd = await self.db.scalar(
                select(PPDAssessment).where(PPDAssessment.user_id == user.id).order_by(PPDAssessment.created_at.desc()).limit(1)
            )
            if latest_ppd:
                lines.append(f"Latest PPD risk: {latest_ppd.risk_level.value}, EPDS score {latest_ppd.epds_score}")
        return "\n".join(lines)
