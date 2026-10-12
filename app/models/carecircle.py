import uuid
from datetime import datetime, timezone, timedelta
from typing import TYPE_CHECKING
import secrets

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class CareCircleQR(Base):
    __tablename__ = "carecircle_qrs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])

    @classmethod
    def create_token(cls, user_id: uuid.UUID, valid_days: int = 30) -> "CareCircleQR":
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=valid_days)
        return cls(user_id=user_id, token=token, expires_at=expires_at)


class CareCircleAccess(Base):
    __tablename__ = "carecircle_access"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_label: Mapped[str] = mapped_column(String(64), default="Caregiver")
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)  # pending, approved, rejected, revoked
    share_emergency: Mapped[bool] = mapped_column(Boolean, default=True)
    share_risk_category: Mapped[bool] = mapped_column(Boolean, default=True)
    share_wellness_summary: Mapped[bool] = mapped_column(Boolean, default=True)
    share_doctor_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    mother: Mapped["User"] = relationship(foreign_keys=[user_id])
    requester: Mapped["User"] = relationship(foreign_keys=[requester_id])
