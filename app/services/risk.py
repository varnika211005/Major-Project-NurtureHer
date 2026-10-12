from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RiskLevel
from app.models.user import User
from app.services.risk_engine import HighRiskEngine


class RiskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def handle_high_risk(self, user: User, source: str, risk_level: RiskLevel, notes: str) -> None:
        del notes
        await HighRiskEngine(self.db).evaluate(user, source, risk_level)
