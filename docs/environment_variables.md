# Environment Variables

## Application

- `PROJECT_NAME`: service display name.
- `ENVIRONMENT`: `development`, `staging`, or `production`.
- `API_V1_PREFIX`: API prefix, default `/api/v1`.
- `BACKEND_CORS_ORIGINS`: comma-separated allowed frontend origins.
- `LOG_LEVEL`: `DEBUG`, `INFO`, `WARNING`, or `ERROR`.
- `METRICS_ENABLED`: enables Prometheus request metrics.

## Database and Redis

- `DATABASE_URL`: async SQLAlchemy URL.
- `SYNC_DATABASE_URL`: synchronous PostgreSQL URL for backup and restore scripts.
- `REDIS_URL`: Redis URL for cache and memory.
- `CELERY_BROKER_URL`: Celery broker URL.
- `CELERY_RESULT_BACKEND`: Celery result backend URL.

## Security

- `JWT_SECRET_KEY`: high-entropy JWT signing key.
- `JWT_ALGORITHM`: JWT algorithm, default `HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: access token lifetime.
- `REFRESH_TOKEN_EXPIRE_DAYS`: refresh token lifetime.
- `ENCRYPTION_KEY`: application encryption key.
- `REQUIRE_PRODUCTION_SECRETS`: when `true`, invalid production config exits with failure. Production container startup sets this automatically.
- `RUN_SEED_ON_STARTUP`: optional, defaults to `false`; only set to `true` when intentional startup seeding is required.
- `NURTUREHER_SEED_ADMIN_PASSWORD`: optional password used by `scripts/seed.py` to create the demo admin user.

## AI and Notifications

- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_MODEL`: Gemini model name.
- `PCOS_MODEL_PATH`: serialized RandomForest model path.
- `SMS_PROVIDER`: `twilio` or `fast2sms`.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`: Twilio credentials.
- `FAST2SMS_API_KEY`: Fast2SMS API key.

In `ENVIRONMENT=production`, placeholder JWT/encryption values, wildcard CORS, and missing SMS credentials for the selected provider are treated as invalid configuration.

## Monitoring

- `SENTRY_DSN`: optional Sentry DSN.
- `SENTRY_TRACES_SAMPLE_RATE`: Sentry tracing sample rate.
- `GRAFANA_ADMIN_PASSWORD`: Grafana admin password for production compose.
