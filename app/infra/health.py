from __future__ import annotations

from fastapi import APIRouter, status
from sqlalchemy import text
from starlette.responses import JSONResponse

from app.core.database import AsyncSessionLocal
from app.core.redis import redis_client

router = APIRouter(tags=["Production Health"])


@router.get("/live")
async def liveness() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/ready")
async def readiness():
    checks = {"database": False, "redis": False}
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            checks["database"] = True
    except Exception:
        checks["database"] = False

    try:
        checks["redis"] = bool(await redis_client.ping())
    except Exception:
        checks["redis"] = False

    healthy = all(checks.values())
    return JSONResponse(
        status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ready" if healthy else "not_ready", "checks": checks},
    )
