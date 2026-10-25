import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import CaseStatus, RiskLevel

if TYPE_CHECKING:
    from app.models.user import User


class HighRiskCase(Base):
    __tablename__ = "high_risk_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    risk_type: Mapped[str] = mapped_column(String(40), nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel, name="case_risk_level"), nullable=False)
    assigned_worker_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus, name="case_status"), default=CaseStatus.OPEN, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="high_risk_cases", foreign_keys=[user_id])

    @property
    def source(self) -> str:
        return self.risk_type

    @source.setter
    def source(self, value: str) -> None:
        self.risk_type = value


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_status: Mapped[str] = mapped_column(String(40), default="queued", nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="alerts")

    @property
    def status(self) -> str:
        return self.sent_status

    @property
    def channel(self) -> str:
        return "sms"

    @property
    def recipient(self) -> str:
        return self.user.phone if self.user else "unavailable"
