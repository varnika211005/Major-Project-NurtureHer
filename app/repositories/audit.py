from uuid import UUID

from sqlalchemy import select

from app.models.audit import AuditLog, RefreshToken
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    async def get_by_jti(self, token_jti: str) -> RefreshToken | None:
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_jti == token_jti, RefreshToken.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def active_for_user(self, user_id: UUID) -> list[RefreshToken]:
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())
