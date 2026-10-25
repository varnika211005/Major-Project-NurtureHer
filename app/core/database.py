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
            if "share_chat_history" not in cols:
                sync_conn.execute(text("ALTER TABLE carecircle_access ADD COLUMN share_chat_history BOOLEAN NOT NULL DEFAULT 0"))
                sync_conn.execute(text("UPDATE carecircle_access SET share_chat_history = 0 WHERE share_chat_history IS NULL"))

        if "nutrition_care_plans" in tables:
            cols = [c[1] for c in sync_conn.execute(text("PRAGMA table_info(nutrition_care_plans)")).fetchall()]
            if "archived_by_id" not in cols:
                sync_conn.execute(text("ALTER TABLE nutrition_care_plans ADD COLUMN archived_by_id UUID NULL"))
            if "archived_at" not in cols:
                sync_conn.execute(text("ALTER TABLE nutrition_care_plans ADD COLUMN archived_at DATETIME NULL"))

        if "users" in tables:
            user_cols = [c[1] for c in sync_conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "custom_id" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN custom_id VARCHAR(64) NULL"))
            if "medical_license" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN medical_license VARCHAR(64) NULL"))
            if "assigned_doctor_id" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN assigned_doctor_id VARCHAR(64) NULL"))
            if "assigned_mother_id" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN assigned_mother_id VARCHAR(64) NULL"))
            if "age" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN age INTEGER NULL"))
            if "specialization" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN specialization VARCHAR(120) NULL"))
            if "qualifications" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN qualifications VARCHAR(255) NULL"))
            if "experience_years" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN experience_years INTEGER NULL"))
            if "hospital_clinic" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN hospital_clinic VARCHAR(255) NULL"))
            if "relationship_label" not in user_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN relationship_label VARCHAR(80) NULL"))
            sync_conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_custom_id ON users (custom_id) WHERE custom_id IS NOT NULL"))
            sync_conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_medical_license ON users (medical_license) WHERE medical_license IS NOT NULL"))
            sync_conn.execute(text("DELETE FROM users WHERE email LIKE '%.local' OR role = 'ASHA_WORKER'"))

        if "doctor_patients" in tables:
            sync_conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_active "
                    "ON doctor_patients (doctor_id, patient_id) "
                    "WHERE status = 'active' AND deleted_at IS NULL"
                )
            )

        if "caregiver_chat_messages" not in tables:
            sync_conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS caregiver_chat_messages (
                        id CHAR(36) PRIMARY KEY,
                        caregiver_id CHAR(36) NOT NULL,
                        mother_id CHAR(36) NULL,
                        message TEXT NOT NULL,
                        response TEXT NOT NULL,
                        sources TEXT NULL,
                        language VARCHAR(16) NOT NULL DEFAULT 'en',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        deleted_at DATETIME NULL,
                        FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (mother_id) REFERENCES users(id) ON DELETE SET NULL
                    )
                    """
                )
            )
            sync_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_caregiver_chat_caregiver_id ON caregiver_chat_messages (caregiver_id)"))
            sync_conn.execute(text("CREATE INDEX IF NOT EXISTS ix_caregiver_chat_mother_id ON caregiver_chat_messages (mother_id)"))
    except Exception:
        pass
