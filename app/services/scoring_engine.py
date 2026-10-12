from app.models.enums import RiskLevel


class EPDScoringEngine:
    def score(self, answers: list[int]) -> int:
        if len(answers) != 10:
            raise ValueError("EPDS requires exactly 10 answers")
        if any(answer < 0 or answer > 3 for answer in answers):
            raise ValueError("EPDS answers must be between 0 and 3")
        return sum(answers)

    def classify(self, epds_score: int, sentiment: str) -> RiskLevel:
        if epds_score >= 13:
            return RiskLevel.HIGH
        if epds_score >= 10 or sentiment == "negative":
            return RiskLevel.MODERATE
        return RiskLevel.LOW

