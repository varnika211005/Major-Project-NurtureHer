from uuid import UUID

from sqlalchemy import desc, or_, select

from app.models.asha import Alert, HighRiskCase
from app.models.caregiver import CaregiverContent
from app.models.chat import ChatMessage
from app.models.enums import CaseStatus, RiskLevel
from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import MotherProfile, User
from app.repositories.base import BaseRepository


class PCOSRepository(BaseRepository[PCOSPrediction]):
    model = PCOSPrediction

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[PCOSPrediction]:
        return await self.paginated(select(PCOSPrediction).where(PCOSPrediction.user_id == user_id).order_by(desc(PCOSPrediction.created_at)), limit, offset)

    async def latest_for_user(self, user_id: UUID) -> PCOSPrediction | None:
        result = await self.db.execute(select(PCOSPrediction).where(PCOSPrediction.user_id == user_id).order_by(desc(PCOSPrediction.created_at)).limit(1))
        return result.scalar_one_or_none()


class PPDRepository(BaseRepository[PPDAssessment]):
    model = PPDAssessment

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[PPDAssessment]:
        return await self.paginated(select(PPDAssessment).where(PPDAssessment.user_id == user_id).order_by(desc(PPDAssessment.created_at)), limit, offset)

    async def latest_for_user(self, user_id: UUID) -> PPDAssessment | None:
        result = await self.db.execute(select(PPDAssessment).where(PPDAssessment.user_id == user_id).order_by(desc(PPDAssessment.created_at)).limit(1))
        return result.scalar_one_or_none()


class ChatRepository(BaseRepository[ChatMessage]):
    model = ChatMessage

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[ChatMessage]:
        return await self.paginated(select(ChatMessage).where(ChatMessage.user_id == user_id).order_by(desc(ChatMessage.created_at)), limit, offset)


class CaregiverContentRepository(BaseRepository[CaregiverContent]):
    model = CaregiverContent

    async def by_category(self, category: str, limit: int = 50, offset: int = 0) -> list[CaregiverContent]:
        return await self.paginated(select(CaregiverContent).where(CaregiverContent.category == category).order_by(desc(CaregiverContent.created_at)), limit, offset)


class HighRiskRepository(BaseRepository[HighRiskCase]):
    model = HighRiskCase

    async def open_cases(
        self,
        risk_level: RiskLevel | None = None,
        status: CaseStatus | None = None,
        search: str | None = None,
        district: str | None = None,
        village: str | None = None,
        risk_type: str | None = None,
        assigned_worker_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[HighRiskCase]:
        stmt = select(HighRiskCase).join(User, User.id == HighRiskCase.user_id).outerjoin(MotherProfile, MotherProfile.user_id == User.id).order_by(desc(HighRiskCase.created_at))
        if risk_level:
            stmt = stmt.where(HighRiskCase.risk_level == risk_level)
        if status:
            stmt = stmt.where(HighRiskCase.status == status)
        if risk_type:
            stmt = stmt.where(HighRiskCase.risk_type == risk_type)
        if assigned_worker_id:
            stmt = stmt.where(HighRiskCase.assigned_worker_id == assigned_worker_id)
        if district:
            stmt = stmt.where(MotherProfile.district.ilike(f"%{district}%"))
        if village:
            stmt = stmt.where(MotherProfile.village.ilike(f"%{village}%"))
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern), User.phone.ilike(pattern)))
        return await self.paginated(stmt, limit, offset)


class AlertRepository(BaseRepository[Alert]):
    model = Alert

    async def for_user(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Alert]:
        return await self.paginated(select(Alert).where(Alert.user_id == user_id).order_by(desc(Alert.created_at)), limit, offset)

    async def all_alerts(self, status: str | None = None, limit: int = 50, offset: int = 0) -> list[Alert]:
        stmt = select(Alert).order_by(desc(Alert.created_at))
        if status:
            stmt = stmt.where(Alert.sent_status == status)
        return await self.paginated(stmt, limit, offset)
