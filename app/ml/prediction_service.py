from app.ml.model_loader import load_pcos_model
from app.ml.pcos_recommendations import PCOSRecommendationEngine
from app.ml.preprocessing import preprocess_pcos_features
from app.models.enums import RiskLevel
from app.schemas.health import PCOSPredictRequest


class PCOSPredictionService:
    def __init__(self) -> None:
        self.recommendations = PCOSRecommendationEngine()

    def predict(self, payload: PCOSPredictRequest) -> tuple[RiskLevel, float, str]:
        features = preprocess_pcos_features(payload)
        model = load_pcos_model()
        probability = float(model.predict_proba([features])[0][1])
        probability = round(max(0.0, min(probability, 1.0)), 2)

        if probability >= 0.65:
            risk = RiskLevel.HIGH
            return (risk, probability, self.recommendations.generate(payload, risk, probability))
        if probability >= 0.35:
            risk = RiskLevel.MODERATE
            return (risk, probability, self.recommendations.generate(payload, risk, probability))
        risk = RiskLevel.LOW
        return (risk, probability, self.recommendations.generate(payload, risk, probability))
