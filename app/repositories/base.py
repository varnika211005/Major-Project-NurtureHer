from __future__ import annotations

from typing import Generic, TypeVar
from uuid import UUID

from datetime import datetime, timezone
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, obj_id: UUID) -> ModelT | None:
        obj = await self.db.get(self.model, obj_id)
        if obj is not None and getattr(obj, "deleted_at", None) is not None:
            return None
        return obj

    async def list(self, stmt: Select | None = None) -> list[ModelT]:
        query = stmt if stmt is not None else select(self.model)
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at.is_(None))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def paginated(self, stmt: Select | None, limit: int, offset: int) -> list[ModelT]:
        query = stmt if stmt is not None else select(self.model)
        if hasattr(self.model, "deleted_at"):
            query = query.where(self.model.deleted_at.is_(None))
        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, **data) -> ModelT:
        obj = self.model(**data)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT, **data) -> ModelT:
        for key, value in data.items():
            if value is not None:
                setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        if hasattr(obj, "deleted_at"):
            setattr(obj, "deleted_at", datetime.now(timezone.utc))
        else:
            await self.db.delete(obj)
        await self.db.flush()
