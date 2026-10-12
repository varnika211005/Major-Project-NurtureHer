import json
from datetime import timedelta
from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.redis import redis_client
from app.models.user import User
from app.models.wellness import Cycle
from app.repositories.health import PCOSRepository, PPDRepository
from app.repositories.wellness import CycleRepository, JournalRepository, MoodRepository, SymptomRepository
from app.schemas.wellness import CycleCreate, CycleUpdate, DashboardStats, JournalCreate, JournalUpdate, MoodCreate, MoodUpdate, SymptomCreate, SymptomUpdate
from app.schemas.wellness import WellnessInsight, WellnessInsightsRead


class WellnessService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_mood(self, user: User, payload: MoodCreate):
        mood = await MoodRepository(self.db).create(user_id=user.id, **payload.model_dump())
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return mood

    async def moods(self, user: User, limit: int = 50, offset: int = 0):
        return await MoodRepository(self.db).for_user(user.id, limit, offset)

    async def get_mood(self, user: User, mood_id: UUID):
        mood = await MoodRepository(self.db).get(mood_id)
        self._ensure_owned(mood, user)
        return mood

    async def update_mood(self, user: User, mood_id: UUID, payload: MoodUpdate):
        repo = MoodRepository(self.db)
        mood = await repo.get(mood_id)
        self._ensure_owned(mood, user)
        mood = await repo.update(mood, **payload.model_dump(exclude_unset=True))
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return mood

    async def delete_mood(self, user: User, mood_id: UUID) -> None:
        repo = MoodRepository(self.db)
        mood = await repo.get(mood_id)
        self._ensure_owned(mood, user)
        await repo.delete(mood)
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")

    async def create_symptom(self, user: User, payload: SymptomCreate):
        symptom = await SymptomRepository(self.db).create(user_id=user.id, **payload.model_dump())
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return symptom

    async def symptoms(self, user: User, limit: int = 50, offset: int = 0):
        return await SymptomRepository(self.db).for_user(user.id, limit, offset)

    async def get_symptom(self, user: User, symptom_id: UUID):
        symptom = await SymptomRepository(self.db).get(symptom_id)
        self._ensure_owned(symptom, user)
        return symptom

    async def update_symptom(self, user: User, symptom_id: UUID, payload: SymptomUpdate):
        repo = SymptomRepository(self.db)
        symptom = await repo.get(symptom_id)
        self._ensure_owned(symptom, user)
        symptom = await repo.update(symptom, **payload.model_dump(exclude_unset=True))
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return symptom

    async def delete_symptom(self, user: User, symptom_id: UUID) -> None:
        repo = SymptomRepository(self.db)
        symptom = await repo.get(symptom_id)
        self._ensure_owned(symptom, user)
        await repo.delete(symptom)
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")

    async def create_journal(self, user: User, payload: JournalCreate):
        journal = await JournalRepository(self.db).create(user_id=user.id, **payload.model_dump())
        await self.db.commit()
        return journal

    async def journals(self, user: User, limit: int = 50, offset: int = 0):
        return await JournalRepository(self.db).for_user(user.id, limit, offset)

    async def get_journal(self, user: User, journal_id: UUID):
        journal = await JournalRepository(self.db).get(journal_id)
        self._ensure_owned(journal, user)
        return journal

    async def update_journal(self, user: User, journal_id: UUID, payload: JournalUpdate):
        repo = JournalRepository(self.db)
        journal = await repo.get(journal_id)
        self._ensure_owned(journal, user)
        journal = await repo.update(journal, **payload.model_dump(exclude_unset=True))
        await self.db.commit()
        return journal

    async def delete_journal(self, user: User, journal_id: UUID) -> None:
        repo = JournalRepository(self.db)
        journal = await repo.get(journal_id)
        self._ensure_owned(journal, user)
        await repo.delete(journal)
        await self.db.commit()

    async def dashboard(self, user: User) -> DashboardStats:
        cache_key = f"dashboard:{user.id}"
        cached = await redis_client.get(cache_key)
        if cached:
            return DashboardStats.model_validate(json.loads(cached))

        mood = await MoodRepository(self.db).latest_for_user(user.id)
        symptoms = await SymptomRepository(self.db).latest_for_user(user.id)
        cycle = await CycleRepository(self.db).latest_for_user(user.id)
        pcos = await PCOSRepository(self.db).latest_for_user(user.id)
        ppd = await PPDRepository(self.db).latest_for_user(user.id)
        stats = DashboardStats(
            today_mood=mood,
            symptoms=symptoms,
            cycle_prediction=cycle.next_period_prediction if cycle else None,
            pcos_risk=pcos.risk_level.value if pcos else None,
            ppd_status=ppd.risk_level.value if ppd else None,
        )
        await redis_client.setex(cache_key, 300, stats.model_dump_json())
        return stats

    async def insights(self, user: User) -> WellnessInsightsRead:
        dashboard = await self.dashboard(user)
        insights: list[WellnessInsight] = []
        if dashboard.today_mood and dashboard.today_mood.mood.value in {"sad", "anxious", "angry"}:
            insights.append(
                WellnessInsight(
                    category="mood",
                    severity="attention",
                    message="Recent mood entry suggests emotional distress. Consider journaling, rest, and talking to a trusted caregiver or clinician.",
                )
            )
        if dashboard.symptoms:
            symptom_count = sum(
                [
                    dashboard.symptoms.fatigue,
                    dashboard.symptoms.headache,
                    dashboard.symptoms.sleep_issue,
                    dashboard.symptoms.anxiety,
                    dashboard.symptoms.cramps,
                ]
            )
            if symptom_count >= 3:
                insights.append(
                    WellnessInsight(
                        category="symptoms",
                        severity="attention",
                        message="Multiple symptoms were reported together. Track changes and seek care if symptoms worsen or affect daily activities.",
                    )
                )
        if dashboard.cycle_prediction:
            insights.append(
                WellnessInsight(
                    category="cycle",
                    message=f"Next period is estimated around {dashboard.cycle_prediction.isoformat()}. Predictions are estimates and improve with regular tracking.",
                )
            )
        if dashboard.pcos_risk == "high":
            insights.append(
                WellnessInsight(
                    category="pcos",
                    severity="high",
                    message="Latest PCOS screening is high risk. A clinical review is recommended for diagnosis and treatment planning.",
                )
            )
        if dashboard.ppd_status in {"moderate", "high"}:
            insights.append(
                WellnessInsight(
                    category="ppd",
                    severity=dashboard.ppd_status,
                    message="Latest postpartum mental health screening needs follow-up. Please connect with a clinician or ASHA worker.",
                )
            )
        if not insights:
            insights.append(
                WellnessInsight(
                    category="wellness",
                    message="No urgent wellness signals detected from recent entries. Continue routine tracking for better trend insights.",
                )
            )
        return WellnessInsightsRead(insights=insights)

    def _ensure_owned(self, obj, user: User) -> None:
        if not obj:
            raise AppError("Resource not found", status.HTTP_404_NOT_FOUND)
        if obj.user_id != user.id and user.role.value != "admin":
            raise AppError("Insufficient permissions", status.HTTP_403_FORBIDDEN)


class CycleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_cycle(self, user: User, payload: CycleCreate):
        prediction = Cycle.predicted_date(payload.last_period_date, payload.cycle_length)
        cycle = await CycleRepository(self.db).create(
            user_id=user.id,
            last_period_date=payload.last_period_date,
            cycle_length=payload.cycle_length,
            next_period_prediction=prediction,
        )
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return cycle

    async def cycles(self, user: User, limit: int = 50, offset: int = 0):
        return await CycleRepository(self.db).for_user(user.id, limit, offset)

    async def prediction(self, user: User):
        cycle = await CycleRepository(self.db).latest_for_user(user.id)
        if not cycle:
            return None
        luteal_phase_days = 14 if cycle.cycle_length >= 24 else max(10, cycle.cycle_length // 2)
        ovulation = cycle.next_period_prediction - timedelta(days=luteal_phase_days)
        return {
            "last_period_date": cycle.last_period_date,
            "next_period_prediction": cycle.next_period_prediction,
            "ovulation_prediction": ovulation,
            "fertility_window_start": ovulation - timedelta(days=5),
            "fertility_window_end": ovulation + timedelta(days=1),
            "cycle_length": cycle.cycle_length,
        }

    async def get_cycle(self, user: User, cycle_id: UUID):
        cycle = await CycleRepository(self.db).get(cycle_id)
        self._ensure_owned(cycle, user)
        return cycle

    async def update_cycle(self, user: User, cycle_id: UUID, payload: CycleUpdate):
        repo = CycleRepository(self.db)
        cycle = await repo.get(cycle_id)
        self._ensure_owned(cycle, user)
        data = payload.model_dump(exclude_unset=True)
        last_period_date = data.get("last_period_date", cycle.last_period_date)
        cycle_length = data.get("cycle_length", cycle.cycle_length)
        data["next_period_prediction"] = Cycle.predicted_date(last_period_date, cycle_length)
        cycle = await repo.update(cycle, **data)
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")
        return cycle

    async def delete_cycle(self, user: User, cycle_id: UUID) -> None:
        repo = CycleRepository(self.db)
        cycle = await repo.get(cycle_id)
        self._ensure_owned(cycle, user)
        await repo.delete(cycle)
        await self.db.commit()
        await redis_client.delete(f"dashboard:{user.id}")

    def _ensure_owned(self, obj, user: User) -> None:
        if not obj:
            raise AppError("Resource not found", status.HTTP_404_NOT_FOUND)
        if obj.user_id != user.id and user.role.value != "admin":
            raise AppError("Insufficient permissions", status.HTTP_403_FORBIDDEN)
