from app.core.security import UserRole
from app.models.enums import CaseStatus, MoodOption, RiskLevel

DEFAULT_PAGE_LIMIT = 50
MAX_PAGE_LIMIT = 100
DASHBOARD_CACHE_SECONDS = 300
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
PASSWORD_RESET_TOKEN_TYPE = "reset"

HIGH_RISK_PCOS_THRESHOLD = RiskLevel.HIGH
HIGH_RISK_PPD_LEVELS = {RiskLevel.MODERATE, RiskLevel.HIGH}

__all__ = [
    "ACCESS_TOKEN_TYPE",
    "CaseStatus",
    "DASHBOARD_CACHE_SECONDS",
    "DEFAULT_PAGE_LIMIT",
    "HIGH_RISK_PCOS_THRESHOLD",
    "HIGH_RISK_PPD_LEVELS",
    "MAX_PAGE_LIMIT",
    "MoodOption",
    "PASSWORD_RESET_TOKEN_TYPE",
    "REFRESH_TOKEN_TYPE",
    "RiskLevel",
    "UserRole",
]

