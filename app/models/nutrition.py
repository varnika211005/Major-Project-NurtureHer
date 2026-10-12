import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
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
