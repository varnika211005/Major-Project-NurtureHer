from __future__ import annotations

from prometheus_client import Gauge
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.redis import redis_client

DB_UP = Gauge("nurtureher_database_up", "Database connectivity status")
REDIS_UP = Gauge("nurtureher_redis_up", "Redis connectivity status")
REDIS_CONNECTED_CLIENTS = Gauge("nurtureher_redis_connected_clients", "Connected Redis clients")


async def collect_infrastructure_metrics() -> None:
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
            DB_UP.set(1)
    except Exception:
        DB_UP.set(0)

    try:
        info = await redis_client.info()
        REDIS_UP.set(1)
        REDIS_CONNECTED_CLIENTS.set(float(info.get("connected_clients", 0)))
    except Exception:
        REDIS_UP.set(0)
        REDIS_CONNECTED_CLIENTS.set(0)
