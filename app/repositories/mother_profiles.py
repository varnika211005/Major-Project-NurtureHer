from uuid import UUID

from sqlalchemy import select

from app.models.user import MotherProfile
from app.repositories.base import BaseRepository


class MotherProfileRepository(BaseRepository[MotherProfile]):
    model = MotherProfile

    async def get_by_user_id(self, user_id: UUID) -> MotherProfile | None:
        result = await self.db.execute(select(MotherProfile).where(MotherProfile.user_id == user_id))
        return result.scalar_one_or_none()

