import uuid
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import MoodOption

if TYPE_CHECKING:
    from app.models.user import User


class Mood(Base):
    __tablename__ = "moods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    mood: Mapped[MoodOption] = mapped_column(Enum(MoodOption, name="mood_option"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="moods")


class Symptom(Base):
    __tablename__ = "symptoms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    fatigue: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    headache: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sleep_issue: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    anxiety: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cramps: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="symptoms")


class Cycle(Base):
    __tablename__ = "cycles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    last_period_date: Mapped[date] = mapped_column(Date, nullable=False)
    cycle_length: Mapped[int] = mapped_column(Integer, default=28, nullable=False)
    next_period_prediction: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="cycles")

    @classmethod
    def predicted_date(cls, last_period_date: date, cycle_length: int) -> date:
        return last_period_date + timedelta(days=cycle_length)


class Journal(Base):
    __tablename__ = "journals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="journals")
