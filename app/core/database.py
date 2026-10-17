from collections.abc import AsyncGenerator
from datetime import datetime
import socket

from sqlalchemy import DateTime, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


class Base(DeclarativeBase):
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


def get_resolved_db_url() -> str:
    url = settings.database_url
    if "sqlite" in url:
        return url
    if "@db:" in url:
        try:
            socket.gethostbyname("db")
        except Exception:
            # Fallback for local development when Docker 'db' host is not reachable
            return "sqlite+aiosqlite:///./nurtureher.db"
    return url


resolved_url = get_resolved_db_url()
engine = create_async_engine(resolved_url, pool_pre_ping=True, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def ensure_sqlite_schema(sync_conn) -> None:
    """
    Ensure SQLite tables contain backward-compatible columns (e.g. share_nutrition)
    without dropping or altering existing user data.
    """
    if "sqlite" not in str(sync_conn.engine.url):
        return
    from sqlalchemy import text
    try:
        tables_res = sync_conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        tables = [r[0] for r in tables_res]
        if "carecircle_access" in tables:
            cols = [c[1] for c in sync_conn.execute(text("PRAGMA table_info(carecircle_access)")).fetchall()]
            if "share_nutrition" not in cols:
                sync_conn.execute(text("ALTER TABLE carecircle_access ADD COLUMN share_nutrition BOOLEAN NOT NULL DEFAULT 0"))
                sync_conn.execute(text("UPDATE carecircle_access SET share_nutrition = 0 WHERE share_nutrition IS NULL"))

        if "nutrition_care_plans" in tables:
            cols = [c[1] for c in sync_conn.execute(text("PRAGMA table_info(nutrition_care_plans)")).fetchall()]
            if "archived_by_id" not in cols:
                sync_conn.execute(text("ALTER TABLE nutrition_care_plans ADD COLUMN archived_by_id UUID NULL"))
            if "archived_at" not in cols:
                sync_conn.execute(text("ALTER TABLE nutrition_care_plans ADD COLUMN archived_at DATETIME NULL"))
    except Exception:
        pass

