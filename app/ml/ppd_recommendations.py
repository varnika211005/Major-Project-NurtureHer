from app.models.enums import RiskLevel


class PPDRecommendationEngine:
    def generate(self, epds_score: int, sentiment: str, risk: RiskLevel) -> str:
        if risk == RiskLevel.HIGH:
            return (
                f"EPDS score {epds_score} with {sentiment} sentiment indicates high risk. "
                "Please contact a healthcare professional urgently, and seek immediate help for self-harm thoughts."
            )
        if risk == RiskLevel.MODERATE:
            return (
                f"EPDS score {epds_score} with {sentiment} sentiment indicates moderate risk. "
                "Please arrange follow-up with a clinician or ASHA worker and ask a trusted caregiver for practical support."
            )
        return (
            f"EPDS score {epds_score} with {sentiment} sentiment indicates low current risk. "
            "Continue mood tracking, rest support, and routine postpartum check-ins."
        )
