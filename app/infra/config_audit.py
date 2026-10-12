from dataclasses import dataclass

from app.core.config import Settings


INSECURE_VALUES = {
    "change-me-in-production",
    "change-me-32-byte-key-for-prod!!",
    "dev-only-change-this-secret",
    "dev-only-32-byte-encryption-key",
}


def _is_placeholder(value: str | None) -> bool:
    return value is None or value.startswith("replace-with-") or value in INSECURE_VALUES


@dataclass(frozen=True)
class ConfigAuditResult:
    ok: bool
    errors: list[str]


def audit_production_config(settings: Settings) -> ConfigAuditResult:
    errors: list[str] = []
    if settings.environment.lower() == "production":
        if _is_placeholder(settings.jwt_secret_key):
            errors.append("JWT_SECRET_KEY must be replaced with a high-entropy production secret")
        if _is_placeholder(settings.encryption_key):
            errors.append("ENCRYPTION_KEY must be replaced with a high-entropy production key")
        if "localhost" in settings.database_url:
            errors.append("DATABASE_URL should not use localhost in containerized production")
        if "localhost" in settings.redis_url:
            errors.append("REDIS_URL should not use localhost in containerized production")
        if not settings.backend_cors_origins:
            errors.append("BACKEND_CORS_ORIGINS must contain at least one trusted origin")
        if "*" in settings.cors_origins:
            errors.append("BACKEND_CORS_ORIGINS must not use '*' in production")
        if settings.access_token_expire_minutes > 60:
            errors.append("ACCESS_TOKEN_EXPIRE_MINUTES should be 60 or less in production")
        if settings.sms_provider.lower() == "twilio" and any(
            _is_placeholder(value) for value in [settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]
        ):
            errors.append("Twilio SMS credentials must be configured when SMS_PROVIDER=twilio in production")
        if settings.sms_provider.lower() == "fast2sms" and _is_placeholder(settings.fast2sms_api_key):
            errors.append("FAST2SMS_API_KEY must be configured when SMS_PROVIDER=fast2sms in production")
    return ConfigAuditResult(ok=not errors, errors=errors)
