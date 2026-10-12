import logging
import asyncio
from datetime import datetime, timezone
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.models.asha import Alert
from app.services.sms_provider import get_sms_provider
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.workers.tasks.send_sms_alert",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def send_sms_alert(self, alert_id: str, phone_number: str, message: str) -> bool:
    del self
    logger.info("Sending SMS alert for %s", phone_number)
    sent = get_sms_provider().send_sms(phone_number, message)
    asyncio.run(_mark_alert_status(alert_id, "sent" if sent else "failed"))
    return sent


async def _mark_alert_status(alert_id: str, sent_status: str) -> None:
    async with AsyncSessionLocal() as db:
        alert = await db.get(Alert, UUID(alert_id))
        if not alert:
            return
        alert.sent_status = sent_status
        alert.sent_at = datetime.now(timezone.utc)
        await db.commit()


@celery_app.task(name="app.workers.tasks.scheduled_health_check")
def scheduled_health_check() -> bool:
    logger.info("Scheduled worker heartbeat completed")
    return True


@celery_app.task(name="app.workers.tasks.expire_stale_alerts")
def expire_stale_alerts() -> int:
    updated = asyncio.run(_expire_stale_alerts())
    logger.info("Expired stale queued alerts: %s", updated)
    return updated


async def _expire_stale_alerts() -> int:
    from datetime import timedelta
    from sqlalchemy import select

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    count = 0
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Alert).where(Alert.sent_status == "queued", Alert.created_at < cutoff))
        for alert in result.scalars().all():
            alert.sent_status = "expired"
            count += 1
        await db.commit()
    return count
