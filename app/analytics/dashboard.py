from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pcos import PCOSPrediction
from app.models.ppd import PPDAssessment
from app.models.user import User
from app.models.wellness import Cycle, Mood, Symptom


class MotherAnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def dashboard(self, user: User) -> dict:
        mood_rows = await self.db.execute(
            select(Mood.mood, func.count()).where(Mood.user_id == user.id).group_by(Mood.mood)
        )
        symptom_rows = await self.db.execute(
            select(
                func.sum(cast(Symptom.fatigue, Integer)),
                func.sum(cast(Symptom.headache, Integer)),
                func.sum(cast(Symptom.sleep_issue, Integer)),
                func.sum(cast(Symptom.anxiety, Integer)),
                func.sum(cast(Symptom.cramps, Integer)),
            ).where(Symptom.user_id == user.id)
        )
        latest_cycle = await self.db.scalar(select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.created_at.desc()).limit(1))
        cycle_summary = await self.db.execute(
            select(func.count(Cycle.id), func.avg(Cycle.cycle_length), func.min(Cycle.cycle_length), func.max(Cycle.cycle_length)).where(
                Cycle.user_id == user.id
            )
        )
        pcos_history = await self.db.execute(
            select(PCOSPrediction.risk_level, func.count()).where(PCOSPrediction.user_id == user.id).group_by(PCOSPrediction.risk_level)
        )
        latest_pcos = await self.db.scalar(
            select(PCOSPrediction).where(PCOSPrediction.user_id == user.id).order_by(PCOSPrediction.created_at.desc()).limit(1)
        )
        ppd_history = await self.db.execute(
            select(PPDAssessment.risk_level, func.count()).where(PPDAssessment.user_id == user.id).group_by(PPDAssessment.risk_level)
        )
        latest_ppd = await self.db.scalar(
            select(PPDAssessment).where(PPDAssessment.user_id == user.id).order_by(PPDAssessment.created_at.desc()).limit(1)
        )
        symptom_counts = symptom_rows.one_or_none() or (0, 0, 0, 0, 0)
        cycle_count, avg_cycle_length, min_cycle_length, max_cycle_length = cycle_summary.one_or_none() or (0, None, None, None)
        regularity_range = (max_cycle_length - min_cycle_length) if min_cycle_length is not None and max_cycle_length is not None else None
        return {
            "mood_trends": {str(mood.value): count for mood, count in mood_rows.all()},
            "symptom_trends": {
                "fatigue": symptom_counts[0] or 0,
                "headache": symptom_counts[1] or 0,
                "sleep_issue": symptom_counts[2] or 0,
                "anxiety": symptom_counts[3] or 0,
                "cramps": symptom_counts[4] or 0,
            },
            "cycle_insights": {
                "last_period_date": latest_cycle.last_period_date.isoformat() if latest_cycle else None,
                "next_period_prediction": latest_cycle.next_period_prediction.isoformat() if latest_cycle else None,
                "cycle_length": latest_cycle.cycle_length if latest_cycle else None,
                "cycle_entries": cycle_count or 0,
                "average_cycle_length": round(float(avg_cycle_length), 1) if avg_cycle_length is not None else None,
                "regularity_range_days": regularity_range,
                "regularity": "irregular" if regularity_range is not None and regularity_range > 7 else "regular" if cycle_count else None,
            },
            "pcos_history": {risk.value: count for risk, count in pcos_history.all()},
            "pcos_latest": {
                "risk_level": latest_pcos.risk_level.value if latest_pcos else None,
                "probability": latest_pcos.probability if latest_pcos else None,
                "recommendations": latest_pcos.recommendations if latest_pcos else None,
            },
            "ppd_history": {risk.value: count for risk, count in ppd_history.all()},
            "ppd_latest": {
                "risk_level": latest_ppd.risk_level.value if latest_ppd else None,
                "epds_score": latest_ppd.epds_score if latest_ppd else None,
                "sentiment": latest_ppd.sentiment if latest_ppd else None,
            },
        }
