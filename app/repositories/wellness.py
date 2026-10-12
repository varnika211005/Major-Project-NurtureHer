from uuid import UUID

from sqlalchemy import desc, func, select

from app.models.wellness import Cycle, Journal, Mood, Symptom
from app.repositories.base import BaseRepository


class MoodRepository(BaseRepository[Mood]):
    model = Mood

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Mood]:
        return await self.paginated(select(Mood).where(Mood.user_id == user_id).order_by(desc(Mood.created_at)), limit, offset)

    async def latest_for_user(self, user_id: UUID) -> Mood | None:
        result = await self.db.execute(select(Mood).where(Mood.user_id == user_id).order_by(desc(Mood.created_at)).limit(1))
        return result.scalar_one_or_none()


class SymptomRepository(BaseRepository[Symptom]):
    model = Symptom

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Symptom]:
        return await self.paginated(select(Symptom).where(Symptom.user_id == user_id).order_by(desc(Symptom.created_at)), limit, offset)

    async def latest_for_user(self, user_id: UUID) -> Symptom | None:
        result = await self.db.execute(select(Symptom).where(Symptom.user_id == user_id).order_by(desc(Symptom.created_at)).limit(1))
        return result.scalar_one_or_none()


class JournalRepository(BaseRepository[Journal]):
    model = Journal

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Journal]:
        return await self.paginated(select(Journal).where(Journal.user_id == user_id).order_by(desc(Journal.created_at)), limit, offset)


class CycleRepository(BaseRepository[Cycle]):
    model = Cycle

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Cycle]:
        return await self.paginated(select(Cycle).where(Cycle.user_id == user_id).order_by(desc(Cycle.created_at)), limit, offset)

    async def latest_for_user(self, user_id: UUID) -> Cycle | None:
        result = await self.db.execute(select(Cycle).where(Cycle.user_id == user_id).order_by(desc(Cycle.created_at)).limit(1))
        return result.scalar_one_or_none()


async def wellness_counts(db, user_id: UUID) -> dict[str, int]:
    mood_count = await db.scalar(select(func.count()).select_from(Mood).where(Mood.user_id == user_id))
    symptom_count = await db.scalar(select(func.count()).select_from(Symptom).where(Symptom.user_id == user_id))
    journal_count = await db.scalar(select(func.count()).select_from(Journal).where(Journal.user_id == user_id))
    return {
        "mood_entries": mood_count or 0,
        "symptom_entries": symptom_count or 0,
        "journal_entries": journal_count or 0,
    }
