from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "NurtureHer"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+asyncpg://nurtureher:nurtureher@localhost:5432/nurtureher"
    sync_database_url: str = "postgresql://nurtureher:nurtureher@localhost:5432/nurtureher"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    jwt_secret_key: str = Field(default="change-me-in-production", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    encryption_key: str = Field(default="change-me-32-byte-key-for-prod!!", min_length=16)
    backend_cors_origins: str = "http://localhost:3000,http://localhost:5173"
    pcos_model_path: str = "app/ml/artifacts/pcos_random_forest.pkl"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    sms_provider: str = "twilio"
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    fast2sms_api_key: str | None = None
    metrics_enabled: bool = True
    log_level: str = "INFO"
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.05

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
