from uuid import UUID

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.ml.prediction_service import PCOSPredictionService
from app.models.caregiver import CaregiverContent
from app.models.user import User
from app.repositories.health import CaregiverContentRepository, PCOSRepository, PPDRepository
from app.schemas.health import CaregiverContentCreate, CaregiverContentUpdate, PCOSPredictRequest, PPDAssessmentRequest
from app.services.chat_service import ChatbotService
from app.services.ppd_service import PPDRiskDetectionService
from app.services.risk import RiskService


class PCOSService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.prediction_service = PCOSPredictionService()

    async def predict(self, user: User, payload: PCOSPredictRequest):
        risk, probability, recommendations = self.prediction_service.predict(payload)
        prediction = await PCOSRepository(self.db).create(
            user_id=user.id,
            risk_level=risk,
            probability=probability,
            recommendations=recommendations,
        )
        await RiskService(self.db).handle_high_risk(user, "pcos", risk, recommendations)
        await self.db.commit()
        return prediction

    async def history(self, user: User, limit: int = 50, offset: int = 0):
        return await PCOSRepository(self.db).for_user(user.id, limit, offset)


class PPDService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.detector = PPDRiskDetectionService()

    async def assess(self, user: User, payload: PPDAssessmentRequest):
        score, sentiment, risk = self.detector.assess(payload)
        assessment = await PPDRepository(self.db).create(
            user_id=user.id,
            epds_score=score,
            sentiment=sentiment,
            risk_level=risk,
        )
        await RiskService(self.db).handle_high_risk(user, "ppd", risk, f"EPDS score {score}; sentiment {sentiment}")
        await self.db.commit()
        return assessment

    async def history(self, user: User, limit: int = 50, offset: int = 0):
        return await PPDRepository(self.db).for_user(user.id, limit, offset)


ChatService = ChatbotService


class CaregiverService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def content(self, category: str, limit: int = 50, offset: int = 0) -> list[CaregiverContent]:
        return await CaregiverContentRepository(self.db).by_category(category, limit, offset)

    async def get_content(self, content_id: UUID) -> CaregiverContent:
        content = await CaregiverContentRepository(self.db).get(content_id)
        if not content:
            raise AppError("Caregiver content not found", status.HTTP_404_NOT_FOUND)
        return content

    async def create_content(self, payload: CaregiverContentCreate) -> CaregiverContent:
        content = await CaregiverContentRepository(self.db).create(**payload.model_dump())
        await self.db.commit()
        return content

    async def update_content(self, content_id: UUID, payload: CaregiverContentUpdate) -> CaregiverContent:
        repo = CaregiverContentRepository(self.db)
        content = await repo.get(content_id)
        if not content:
            raise AppError("Caregiver content not found", status.HTTP_404_NOT_FOUND)
        content = await repo.update(content, **payload.model_dump(exclude_unset=True))
        await self.db.commit()
        return content

    async def delete_content(self, content_id: UUID) -> None:
        repo = CaregiverContentRepository(self.db)
        content = await repo.get(content_id)
        if not content:
            raise AppError("Caregiver content not found", status.HTTP_404_NOT_FOUND)
        await repo.delete(content)
        await self.db.commit()
