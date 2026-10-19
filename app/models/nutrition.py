import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # pregnancy, postpartum, pcos, general
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    phase: Mapped[str | None] = mapped_column(String(64), nullable=True)  # Trimester 1, Trimester 2/3, Early Postpartum, Lactation, Low GI PCOS
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)  # breakfast, lunch, dinner, snack, drink
    description: Mapped[str] = mapped_column(Text, nullable=False)
    local_foods: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "Ragi mudde, Moringa (drumstick) sambar, Curd"
    key_nutrients: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g., "Iron, Folate, Calcium, Fiber"
    is_affordable_local: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class HydrationLog(Base):
    __tablename__ = "hydration_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    cups: Mapped[int] = mapped_column(Integer, default=0)
    target_cups: Mapped[int] = mapped_column(Integer, default=8)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])


class NutritionProfile(Base):
    __tablename__ = "nutrition_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    dietary_preferences: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    dietary_restrictions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    allergies: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    breastfeeding: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class NutritionCarePlan(Base):
    __tablename__ = "nutrition_care_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mother_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    applicable_context: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    meals: Mapped[list[dict[str, object]]] = mapped_column(JSON, default=list, nullable=False)
    preparation_guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinician_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="general", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class NutritionInteraction(Base):
    __tablename__ = "nutrition_interactions"
    __table_args__ = (UniqueConstraint("user_id", "recommendation_key", "log_date", name="uq_nutrition_interaction_day"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recommendation_key: Mapped[str] = mapped_column(String(100), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    saved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
