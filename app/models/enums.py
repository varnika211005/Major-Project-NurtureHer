from enum import Enum


class MoodOption(str, Enum):
    HAPPY = "happy"
    SAD = "sad"
    ANXIOUS = "anxious"
    TIRED = "tired"
    ANGRY = "angry"


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class CaseStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"
