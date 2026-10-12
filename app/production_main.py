from fastapi.middleware.gzip import GZipMiddleware

from app.infra.health import router as health_router
from app.infra.metrics import collect_infrastructure_metrics
from app.infra.response_cache import ResponseCacheMiddleware
from app.infra.security_headers import SecurityHeadersMiddleware
from app.main import app
from app.monitoring.metrics import metrics_response

if app.middleware_stack is None:
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(ResponseCacheMiddleware, ttl_seconds=60)
    app.add_middleware(SecurityHeadersMiddleware)

existing_paths = {getattr(route, "path", "") for route in app.routes}
if "/ready" not in existing_paths:
    app.include_router(health_router)


@app.get("/metrics/infra", include_in_schema=False)
async def infrastructure_metrics():
    await collect_infrastructure_metrics()
    return await metrics_response()
