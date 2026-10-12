from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

from app.rag.context_builder import HealthContextBuilder


class RAGService:
    def __init__(self, db: AsyncSession | None = None) -> None:
        self.context_builder = HealthContextBuilder(db)

    async def build_context(self, user: User, message: str, language: str) -> tuple[str, str]:
        return await self.context_builder.build(user, message, language)

    async def retrieve_context(self, user: User, message: str) -> str:
        retrieved_context, user_context = await self.build_context(user, message, user.preferred_language)
        return f"{retrieved_context}\n\nPersonalized user context:\n{user_context}"
