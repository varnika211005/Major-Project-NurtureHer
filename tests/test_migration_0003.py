"""Migration 0003 (legacy ASHA deactivation + missing DOCTOR label).

Chain checks need no database. Upgrade-path tests run 0003's upgrade()
against disposable SQLite files via a minimal migration context — never
against a real database. The PostgreSQL-only branches (pg_enum catalog
checks, ALTER TYPE ... ADD VALUE) are dialect-guarded and cannot execute on
SQLite: role is stored as plain text there, and no pg_enum catalog exists.
PostgreSQL behavior is verified against the deployment database during the
migration verification procedure, not here.
"""

import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

import app.models  # noqa: F401 - register all models on Base.metadata
from app.core.database import Base
from app.core.security import UserRole
from app.models.user import User

REVISION_ID = "0003_deactivate_asha_role"
REVISION_PATH = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "alembic"
    / "versions"
    / f"{REVISION_ID}.py"
)


def _load_revision():
    spec = importlib.util.spec_from_file_location("migration_0003", REVISION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_module_declares_expected_chain():
    revision = _load_revision()
    assert revision.revision == REVISION_ID
    assert revision.down_revision == "0002_production_indexes"
    assert len(revision.revision) <= 32


def _run_upgrade(engine):
    revision = _load_revision()
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            revision.upgrade()
        conn.commit()


def _run_downgrade(engine):
    revision = _load_revision()
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            revision.downgrade()
        conn.commit()


def _fresh_sqlite(tmp_path, name="mig0003.db"):
    engine = create_engine(f"sqlite:///{tmp_path / name}")
    Base.metadata.create_all(engine)
    return engine


def _seed_users(engine) -> tuple[str, str]:
    """Insert one soon-to-be-legacy user and one normal user.

    The legacy row is inserted through the ORM as MOTHER (the model's enum),
    then flipped by raw SQL: SQLite's role column is plain VARCHAR with no
    CHECK constraint, so 'ASHA_WORKER' can be written directly.
    """
    with Session(engine) as session:
        legacy = User(
            email="legacy@example.com",
            name="Legacy User",
            password_hash="x",
            role=UserRole.MOTHER,
            preferred_language="en",
            is_active=True,
            is_verified=True,
        )
        normal = User(
            email="normal@example.com",
            name="Normal User",
            password_hash="x",
            role=UserRole.MOTHER,
            preferred_language="en",
            is_active=True,
            is_verified=True,
        )
        session.add_all([legacy, normal])
        session.commit()
    with engine.begin() as conn:
        conn.execute(
            sa.text("UPDATE users SET role = 'ASHA_WORKER' WHERE email = 'legacy@example.com'")
        )
    return "legacy@example.com", "normal@example.com"


def _row(engine, email: str):
    with engine.connect() as conn:
        return conn.execute(
            sa.text("SELECT email, role, is_active FROM users WHERE email = :email"),
            {"email": email},
        ).one()


def test_upgrade_deactivates_legacy_rows_without_deleting_them(tmp_path):
    engine = _fresh_sqlite(tmp_path)
    legacy_email, normal_email = _seed_users(engine)
    _run_upgrade(engine)

    legacy = _row(engine, legacy_email)
    assert legacy.role == "ASHA_WORKER"
    assert legacy.is_active in (False, 0), "legacy row must be deactivated"
    normal = _row(engine, normal_email)
    assert normal.is_active in (True, 1), "normal rows must stay active"

    with engine.connect() as conn:
        count = conn.execute(sa.text("SELECT COUNT(*) FROM users")).scalar()
    assert count == 2, "no user row may be deleted"
    engine.dispose()


def test_upgrade_is_idempotent(tmp_path):
    engine = _fresh_sqlite(tmp_path)
    legacy_email, _ = _seed_users(engine)
    _run_upgrade(engine)
    _run_upgrade(engine)  # re-run after an interrupted upgrade must be safe
    legacy = _row(engine, legacy_email)
    assert legacy.is_active in (False, 0)
    engine.dispose()


def test_downgrade_never_reactivates_legacy_rows(tmp_path):
    engine = _fresh_sqlite(tmp_path)
    legacy_email, _ = _seed_users(engine)
    _run_upgrade(engine)
    _run_downgrade(engine)
    legacy = _row(engine, legacy_email)
    assert legacy.role == "ASHA_WORKER"
    assert legacy.is_active in (False, 0), "downgrade must not restore access"
    engine.dispose()


def test_upgrade_skips_pg_enum_logic_on_non_postgres(tmp_path):
    # If upgrade() consulted pg_enum or issued ALTER TYPE on SQLite, this
    # would raise (no such table / syntax error). Reaching the assertions
    # proves the dialect guard.
    engine = _fresh_sqlite(tmp_path)
    _seed_users(engine)
    _run_upgrade(engine)
    names = set(inspect(engine).get_table_names())
    assert "users" in names
    engine.dispose()
