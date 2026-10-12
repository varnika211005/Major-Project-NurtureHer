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
