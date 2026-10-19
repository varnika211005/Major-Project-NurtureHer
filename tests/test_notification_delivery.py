"""Notification delivery contract tests: statuses, retry config, expiry, fallback.

Offline: disposable file SQLite, stubbed SMS provider, Celery task
functions invoked directly (no broker). Real delivery is NOT proven here --
that requires provider credentials plus running workers; see RAG_RUNBOOK.
"""

import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, select

import app.models  # noqa: F401 -- register all models
import app.workers.tasks as worker_tasks
from app.core.database import Base
from app.models.asha import Alert


@pytest.fixture
def _worker_db(tmp_path, monkeypatch):
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    db_path = str(tmp_path / "worker.db")
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    sync_engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(sync_engine)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(worker_tasks, "AsyncSessionLocal", factory)
    return {"factory": factory, "path": db_path}


async def _make_alert(worker_db, phone="+911000000009", age_hours=0, status="queued"):
    factory = worker_db["factory"]
    async with factory() as session:
        alert = Alert(
            user_id=uuid.uuid4(), message="Test escalation",
            sent_status=status, sent_at=None,
        )
        session.add(alert)
        await session.commit()
        alert_id = alert.id
    if age_hours:
        import sqlite3
        from datetime import timezone

        # UTC wall time: SQLite CURRENT_TIMESTAMP and the worker cutoff are
        # both UTC-based; naive-local arithmetic would skew by the TZ offset.
        old = (datetime.now(timezone.utc) - timedelta(hours=age_hours)).strftime("%Y-%m-%d %H:%M:%S")
        conn = sqlite3.connect(worker_db["path"])
        conn.execute(
            "UPDATE alerts SET created_at = ? WHERE id = ?",
            (old, str(alert_id).replace("-", "")),
        )
        conn.commit()
        conn.close()
    return alert_id


class _Provider:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def send_sms(self, phone, message):
        self.calls.append((phone, message))
        return self.result


async def test_sent_and_failed_statuses_are_independent(_worker_db, monkeypatch):
    import asyncio

    ok_provider = _Provider(True)
    fail_provider = _Provider(False)
    monkeypatch.setattr(worker_tasks, "get_sms_provider", lambda: ok_provider)
    ok_id = await _make_alert(_worker_db)
    # Celery task bodies call asyncio.run internally, so they must execute
    # off this test's running loop (as a worker process would).
    assert await asyncio.to_thread(worker_tasks.send_sms_alert, str(ok_id), "+911", "msg-ok") is True
    monkeypatch.setattr(worker_tasks, "get_sms_provider", lambda: fail_provider)
    fail_id = await _make_alert(_worker_db)
    assert await asyncio.to_thread(worker_tasks.send_sms_alert, str(fail_id), "+912", "msg-fail") is False

    async with _worker_db["factory"]() as session:
        rows = {row.id: row for row in (await session.execute(select(Alert))).scalars().all()}
    assert rows[ok_id].sent_status == "sent"
    assert rows[ok_id].sent_at is not None
    assert rows[fail_id].sent_status == "failed"
    assert rows[fail_id].sent_at is not None


async def test_expire_stale_queued_alerts(_worker_db):
    import asyncio

    fresh_id = await _make_alert(_worker_db)
    stale_id = await _make_alert(_worker_db, age_hours=25)
    assert await asyncio.to_thread(worker_tasks.expire_stale_alerts) == 1
    async with _worker_db["factory"]() as session:
        rows = {row.id: row for row in (await session.execute(select(Alert))).scalars().all()}
    assert rows[fresh_id].sent_status == "queued"
    assert rows[stale_id].sent_status == "expired"


def test_retry_policy_declared_on_task():
    task = worker_tasks.send_sms_alert
    assert task.autoretry_for == (Exception,)
    assert task.retry_kwargs.get("max_retries") == 3
    assert task.retry_backoff is True
    # Logical provider failure (False) does NOT raise, so Celery autoretry
    # does not fire: failed is terminal and observable, never silent.
