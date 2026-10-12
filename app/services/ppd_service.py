from app.ml.sentiment import analyze_sentiment
from app.ml.ppd_recommendations import PPDRecommendationEngine
from app.models.enums import RiskLevel
from app.schemas.health import PPDAssessmentRequest
from app.services.scoring_engine import EPDScoringEngine


class PPDRiskDetectionService:
    def __init__(self) -> None:
        self.scoring_engine = EPDScoringEngine()
        self.recommendations = PPDRecommendationEngine()

    def assess(self, payload: PPDAssessmentRequest) -> tuple[int, str, RiskLevel]:
        score = self.scoring_engine.score(payload.answers)
        sentiment = analyze_sentiment(payload.journal_text)
        risk = self.scoring_engine.classify(score, sentiment)
        self.recommendations.generate(score, sentiment, risk)
        return score, sentiment, risk
