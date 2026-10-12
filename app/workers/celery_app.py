from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "nurtureher",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.task_routes = {"app.workers.tasks.*": {"queue": "default"}}
celery_app.conf.beat_schedule = {
    "worker-heartbeat-every-5-minutes": {
        "task": "app.workers.tasks.scheduled_health_check",
        "schedule": 300.0,
    },
    "expire-stale-alerts-hourly": {
        "task": "app.workers.tasks.expire_stale_alerts",
        "schedule": 3600.0,
    },
}
