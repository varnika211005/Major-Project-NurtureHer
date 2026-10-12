from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import MoodOption
from app.schemas.common import ORMModel


class MotherProfileCreate(BaseModel):
    age: int | None = Field(default=None, ge=10, le=70)
    weight: float | None = Field(default=None, gt=0, le=250)
    height: float | None = Field(default=None, gt=0, le=250)
    blood_group: str | None = Field(default=None, max_length=8)
    pregnancy_status: str | None = Field(default=None, max_length=80)
    delivery_date: date | None = None
    emergency_contact: str | None = Field(default=None, max_length=32)
    district: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=120)


class MotherProfileUpdate(MotherProfileCreate):
    age: int | None = Field(default=None, ge=10, le=70)
    weight: float | None = Field(default=None, gt=0, le=250)
    height: float | None = Field(default=None, gt=0, le=250)
    blood_group: str | None = Field(default=None, max_length=8)
    pregnancy_status: str | None = Field(default=None, max_length=80)
    delivery_date: date | None = None
    emergency_contact: str | None = Field(default=None, max_length=32)
    district: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=120)


class MotherProfileRead(ORMModel):
    id: UUID
    age: int | None
    weight: float | None
    height: float | None
    blood_group: str | None
    pregnancy_status: str | None
    delivery_date: date | None
    emergency_contact: str | None
    district: str | None
    village: str | None
    created_at: datetime


class MoodCreate(BaseModel):
    mood: MoodOption
    note: str | None = Field(default=None, max_length=1000)


class MoodUpdate(BaseModel):
    mood: MoodOption | None = None
    note: str | None = Field(default=None, max_length=1000)


class MoodRead(ORMModel):
    id: UUID
    mood: MoodOption
    note: str | None
    created_at: datetime


class SymptomCreate(BaseModel):
    fatigue: bool = False
    headache: bool = False
    sleep_issue: bool = False
    anxiety: bool = False
    cramps: bool = False


class SymptomUpdate(BaseModel):
    fatigue: bool | None = None
    headache: bool | None = None
    sleep_issue: bool | None = None
    anxiety: bool | None = None
    cramps: bool | None = None


class SymptomRead(ORMModel):
    id: UUID
    fatigue: bool
    headache: bool
    sleep_issue: bool
    anxiety: bool
    cramps: bool
    created_at: datetime


class JournalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)


class JournalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1)


class JournalRead(ORMModel):
    id: UUID
    title: str
    content: str
    created_at: datetime


class CycleCreate(BaseModel):
    last_period_date: date
    cycle_length: int = Field(default=28, ge=15, le=60)


class CycleUpdate(BaseModel):
    last_period_date: date | None = None
    cycle_length: int | None = Field(default=None, ge=15, le=60)


class CycleRead(ORMModel):
    id: UUID
    last_period_date: date
    cycle_length: int
    next_period_prediction: date
    created_at: datetime


class CyclePredictionRead(BaseModel):
    last_period_date: date
    next_period_prediction: date
    ovulation_prediction: date
    fertility_window_start: date
    fertility_window_end: date
    cycle_length: int


class DashboardStats(BaseModel):
    today_mood: MoodRead | None
    symptoms: SymptomRead | None
    cycle_prediction: date | None
    pcos_risk: str | None
    ppd_status: str | None


class WellnessInsight(BaseModel):
    category: str
    severity: str = "info"
    message: str


class WellnessInsightsRead(BaseModel):
    insights: list[WellnessInsight]
