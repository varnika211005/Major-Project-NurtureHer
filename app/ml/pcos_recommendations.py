
from app.models.enums import RiskLevel
from app.schemas.health import PCOSPredictRequest


class PCOSRecommendationEngine:
    def generate(
        self,
        payload: PCOSPredictRequest,
        risk: RiskLevel,
        probability: float,
    ) -> str:
        recommendations = [
            f"Estimated PCOS risk probability: {probability:.0%}.",
            "Track cycle dates, bleeding patterns, acne, hair growth, weight changes, and energy levels.",
        ]

        if risk == RiskLevel.HIGH:
            recommendations.append(
                "Higher screening risk detected. Consult a gynecologist for clinical evaluation."
            )
        elif risk == RiskLevel.MODERATE:
            recommendations.append(
                "Moderate screening risk detected. Consider clinical review if symptoms persist."
            )
        else:
            recommendations.append(
                "Current screening suggests lower risk. Continue routine wellness tracking."
            )

        if payload.bmi >= 25:
            recommendations.append(
                "Discuss nutrition, physical activity, and metabolic health with a healthcare professional."
            )

        if payload.cycle in (4,):
            recommendations.append(
                "Your recorded cycle category warrants attention. Track your periods and discuss persistent irregularity with a clinician."
            )

        if payload.hair_growth or payload.skin_darkening:
            recommendations.append(
                "Mention changes in hair growth or skin darkening during your clinical consultation."
            )

        if payload.hair_loss or payload.pimples:
            recommendations.append(
                "Record hair loss or acne changes to discuss during your clinical consultation."
            )

        return " ".join(recommendations)
