from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.models.wellness import Cycle, Mood, Symptom
from app.rag.prompt_templates import LANGUAGE_NAMES
from app.rag.retriever import HealthKnowledgeRetriever


class HealthContextBuilder:
    def __init__(self, db: AsyncSession | None = None) -> None:
        self.db = db
        self.retriever = HealthKnowledgeRetriever()

    async def build(self, user: User, message: str, language: str) -> tuple[str, str]:
        retrieved_context = self._format_retrieved_context(message)
        user_context = await self._build_user_context(user, language)
        return retrieved_context, user_context

    def _format_retrieved_context(self, message: str) -> str:
        documents = self.retriever.retrieve(message)
        return "\n".join(
            f"- [{item.document.metadata.get('category')}] {item.document.page_content}" for item in documents
        )

    async def _build_user_context(self, user: User, language: str) -> str:
        lines = [
            f"Name: {user.name}",
            f"Preferred language: {LANGUAGE_NAMES.get(language, language)}",
        ]
        if self.db is None:
            return "\n".join(lines)

        profile = await self.db.scalar(select(MotherProfile).where(MotherProfile.user_id == user.id))
        if profile:
            lines.extend(
                [
                    f"Age: {profile.age or 'unknown'}",
                    f"Pregnancy status: {profile.pregnancy_status or 'unknown'}",
                    f"Delivery date: {profile.delivery_date.isoformat() if profile.delivery_date else 'unknown'}",
                    f"Location: {', '.join(part for part in [profile.village, profile.district] if part) or 'unknown'}",
                ]
            )

        latest_mood = await self.db.scalar(select(Mood).where(Mood.user_id == user.id).order_by(Mood.created_at.desc()).limit(1))
        latest_symptoms = await self.db.scalar(select(Symptom).where(Symptom.user_id == user.id).order_by(Symptom.created_at.desc()).limit(1))
        latest_cycle = await self.db.scalar(select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.created_at.desc()).limit(1))
        latest_pcos = await self.db.scalar(select(PCOSPrediction).where(PCOSPrediction.user_id == user.id).order_by(PCOSPrediction.created_at.desc()).limit(1))
        latest_ppd = await self.db.scalar(select(PPDAssessment).where(PPDAssessment.user_id == user.id).order_by(PPDAssessment.created_at.desc()).limit(1))

        if latest_mood:
            lines.append(f"Latest mood: {latest_mood.mood.value}")
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
        if latest_cycle:
            lines.append(f"Next cycle estimate: {latest_cycle.next_period_prediction.isoformat()}")
        if latest_pcos:
            lines.append(f"Latest PCOS risk: {latest_pcos.risk_level.value} ({latest_pcos.probability:.0%})")
        if latest_ppd:
            lines.append(f"Latest PPD risk: {latest_ppd.risk_level.value}, EPDS score {latest_ppd.epds_score}")
        return "\n".join(lines)
