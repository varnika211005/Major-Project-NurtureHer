# API Documentation

Interactive API documentation is available after startup:

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`

Operational endpoints:

- `GET /health`: basic health.
- `GET /live`: process liveness.
- `GET /ready`: database and Redis readiness.
- `GET /metrics`: Prometheus request metrics.
- `GET /metrics/infra`: Prometheus infrastructure metrics.

Primary API modules are under `/api/v1`:

- `/auth`
- `/wellness`
- `/cycle`
- `/pcos`
- `/ppd`
- `/chat`
- `/caregiver`
- `/admin`
- `/notifications`
