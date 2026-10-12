import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

REQUEST_COUNT = Counter(
    "nurtureher_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)
REQUEST_LATENCY = Histogram(
    "nurtureher_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
)


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        path = request.scope.get("route").path if request.scope.get("route") else request.url.path
        REQUEST_COUNT.labels(request.method, path, str(response.status_code)).inc()
        REQUEST_LATENCY.labels(request.method, path).observe(elapsed)
        return response


async def metrics_response() -> StarletteResponse:
    return StarletteResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

