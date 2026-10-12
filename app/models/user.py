import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.security import UserRole

if TYPE_CHECKING:
    from app.models.audit import RefreshToken
    from app.models.asha import Alert, HighRiskCase
    from app.models.chat import ChatMessage
    from app.models.pcos import PCOSPrediction
    from app.models.ppd import PPDAssessment
    from app.models.wellness import Cycle, Journal, Mood, Symptom


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.MOTHER)
    preferred_language: Mapped[str] = mapped_column(String(16), default="en", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    mother_profile: Mapped["MotherProfile | None"] = relationship(back_populates="user", cascade="all, delete-orphan")
    moods: Mapped[list["Mood"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    symptoms: Mapped[list["Symptom"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    cycles: Mapped[list["Cycle"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    journals: Mapped[list["Journal"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    pcos_predictions: Mapped[list["PCOSPrediction"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    ppd_assessments: Mapped[list["PPDAssessment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    high_risk_cases: Mapped[list["HighRiskCase"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="HighRiskCase.user_id",
    )
    alerts: Mapped[list["Alert"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return self.name

    @full_name.setter
    def full_name(self, value: str) -> None:
        self.name = value

    @property
    def phone_number(self) -> str | None:
        return self.phone

    @phone_number.setter
    def phone_number(self, value: str | None) -> None:
        self.phone = value

    @property
    def hashed_password(self) -> str:
        return self.password_hash

    @hashed_password.setter
    def hashed_password(self, value: str) -> None:
        self.password_hash = value


class MotherProfile(Base):
    __tablename__ = "mother_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    pregnancy_status: Mapped[str | None] = mapped_column(String(80), nullable=True)
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(32), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    village: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="mother_profile")
