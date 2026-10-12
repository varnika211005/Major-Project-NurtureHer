from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from typing import Literal

from app.models.enums import CaseStatus, RiskLevel
from app.schemas.common import ORMModel


class PCOSPredictRequest(BaseModel):
    age: int = Field(ge=10, le=60)
    bmi: float = Field(gt=0, le=80)
    cycle: Literal[2, 4] = Field(description="Dataset encoding: 2 or 4 (kept neutral; no clinical label assigned)")
    cycle_length: int = Field(ge=1, le=100)
    weight_gain: bool
    hair_growth: bool
    skin_darkening: bool
    hair_loss: bool
    pimples: bool

class PCOSPredictionUpdate(BaseModel):
    recommendations: str | None = Field(default=None, max_length=5000)


class PCOSPredictionRead(ORMModel):
    id: UUID
    risk_level: RiskLevel
    probability: float
    recommendations: str
    created_at: datetime


class PPDAssessmentRequest(BaseModel):
    answers: list[int] = Field(min_length=10, max_length=10)
    journal_text: str | None = Field(default=None, max_length=5000)

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, answers: list[int]) -> list[int]:
        if any(answer < 0 or answer > 3 for answer in answers):
            raise ValueError("Each EPDS answer must be between 0 and 3")
        return answers


class PPDAssessmentUpdate(BaseModel):
    sentiment: str | None = Field(default=None, max_length=40)


class PPDAssessmentRead(ORMModel):
    id: UUID
    epds_score: int
    sentiment: str
    risk_level: RiskLevel
    created_at: datetime


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="en", min_length=2, max_length=16)


class ChatUpdate(BaseModel):
    response: str | None = Field(default=None, max_length=5000)


class CaregiverContentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    video_url: str | None = Field(default=None, max_length=500)
    category: str = Field(min_length=1, max_length=80)


class CaregiverContentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    video_url: str | None = Field(default=None, max_length=500)
    category: str | None = Field(default=None, min_length=1, max_length=80)


class ChatRead(ORMModel):
    id: UUID
    message: str
    response: str
    language: str
    created_at: datetime


class CaregiverContentRead(ORMModel):
    id: UUID
    title: str
    description: str
    video_url: str | None
    category: str
    created_at: datetime


class AlertRequest(BaseModel):
    user_id: UUID
    message: str = Field(min_length=1, max_length=500)


class AlertRead(ORMModel):
    id: UUID
    user_id: UUID
    message: str
    sent_status: str
    sent_at: datetime | None


class AlertUpdate(BaseModel):
    sent_status: str = Field(min_length=1, max_length=40)


class HighRiskCaseRead(ORMModel):
    id: UUID
    user_id: UUID
    risk_type: str
    risk_level: RiskLevel
    assigned_worker_id: UUID | None
    status: str
    created_at: datetime


class HighRiskCaseUpdate(BaseModel):
    assigned_worker_id: UUID | None = None
    status: CaseStatus | None = None
