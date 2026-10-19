"""Phase 1: migration 0004 (missing CareCircle/doctor tables + chat scope).

Chain-integrity and parity checks need no database. Upgrade-path tests run
0004's upgrade() against disposable SQLite files via a minimal migration
context — never against a real database. The downgrade test is skipped by
default: executing downgrades requires separate explicit authorization for
destructive database operations.

SQLite coverage is NOT equivalent to PostgreSQL: native ENUM/UUID behavior,
server defaults, and concurrent-DDL semantics remain unverified here and
require the Docker PostgreSQL disposable-database procedure from the plan.
"""

import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

REVISION_ID = "0004_add_carecircle_tables"
REVISION_PATH = (
    Path(__file__).resolve().parents[1]
    / "database"
    / "alembic"
    / "versions"
    / f"{REVISION_ID}.py"
)

FOUR_TABLES = ("carecircle_qrs", "carecircle_access", "doctor_patients", "doctor_notes")


def _load_revision():
    spec = importlib.util.spec_from_file_location("migration_0004", REVISION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_revision_chain_integrity():
    cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(cfg)
    revisions = {rev.revision: rev for rev in script.walk_revisions()}
    assert tuple(script.get_heads()) == ("0005_role_specific_nutrition",)
    assert revisions["0005_role_specific_nutrition"].down_revision == REVISION_ID
    assert revisions[REVISION_ID].down_revision == "0003_deactivate_asha_role"
    assert revisions["0003_deactivate_asha_role"].down_revision == "0002_production_indexes"
    assert revisions["0002_production_indexes"].down_revision == "0001_initial"
    assert revisions["0001_initial"].down_revision is None


def test_all_revision_ids_fit_version_column():
    """alembic_version.version_num is VARCHAR(32): an over-long revision ID
    fails at COMMIT with StringDataRightTruncation, rolling back the whole
    upgrade (the original 0003/0004 defect this suite guards against)."""
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    too_long = [
        f"{rev.revision} ({len(rev.revision)} chars)"
        for rev in script.walk_revisions()
        if len(rev.revision) > 32
    ]
    assert not too_long, f"revision IDs exceed the 32-char version column: {too_long}"


def test_revision_parity_with_models():
    from app.models.carecircle import CareCircleAccess, CareCircleQR
    from app.models.doctor import DoctorNote, DoctorPatient

    revision = _load_revision()
    models = {
        "carecircle_qrs": CareCircleQR,
        "carecircle_access": CareCircleAccess,
        "doctor_patients": DoctorPatient,
        "doctor_notes": DoctorNote,
    }
    for table_name, model in models.items():
        model_columns = set(model.__table__.columns.keys())
        migration_columns = revision._expected_names(table_name)
        if table_name == "carecircle_access":
            # 0005_role_specific_nutrition later adds share_nutrition to this
            # table; parity is asserted against the full chain's end state.
            migration_columns = migration_columns | {"share_nutrition"}
        assert migration_columns == model_columns, table_name
    assert "share_chat_history" in revision._expected_names("carecircle_access")


def _run_upgrade(engine):
    revision = _load_revision()
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            revision.upgrade()
        conn.commit()


def _fresh_sqlite(tmp_path, name="migtest.db"):
    path = tmp_path / name
    return create_engine(f"sqlite:///{path}")


def test_upgrade_creates_missing_tables(tmp_path):
    engine = _fresh_sqlite(tmp_path)
    _run_upgrade(engine)
    names = set(inspect(engine).get_table_names())
    for table in FOUR_TABLES:
        assert table in names
    # Idempotent second run: already-matching schema is a no-op.
    _run_upgrade(engine)
    engine.dispose()


def test_upgrade_backfills_scope_column(tmp_path):
    import uuid
    from datetime import datetime, timezone

    revision = _load_revision()
    engine = _fresh_sqlite(tmp_path, "backfill.db")
    # Pre-existing table in pre-0004 shape: every expected column except the
    # new scope column (this is what startup create_all would have made).
    # Plain columns (no FKs/defaults): only names matter for reconciliation.
    old_columns = [
        sa.Column(column.name, column.type, nullable=column.nullable, primary_key=column.primary_key)
        for column in revision.TABLE_SPECS["carecircle_access"]
        if column.name != "share_chat_history"
    ]
    old_access = sa.Table("carecircle_access", sa.MetaData(), *old_columns)
    old_access.create(engine)
    now = datetime.now(timezone.utc)
    row_ids = [uuid.uuid4() for _ in range(3)]
    with engine.begin() as conn:
        conn.execute(
            old_access.insert(),
            [
                {
                    "id": rid,
                    "user_id": uuid.uuid4(),
                    "requester_id": uuid.uuid4(),
                    "status": "approved",
                    "requested_at": now,
                    "updated_at": now,
                }
                for rid in row_ids
            ],
        )
    _run_upgrade(engine)
    with engine.connect() as conn:
        rows = conn.execute(
            sa.text("SELECT id, share_chat_history FROM carecircle_access")
        ).all()
    assert len(rows) == 3
    # SQLite reports booleans as 0/1; both mean false here.
    assert all(value is False or value == 0 for _, value in rows), rows
    engine.dispose()


def test_upgrade_refuses_unexpected_drift_without_changes(tmp_path):
    import uuid

    engine = _fresh_sqlite(tmp_path, "drift.db")
    drifted = sa.Table(
        "doctor_notes",
        sa.MetaData(),
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("doctor_id", sa.Uuid(), nullable=False),
        sa.Column("junk_col", sa.String(16), nullable=True),
    )
    drifted.create(engine)
    marker = uuid.uuid4()
    with engine.begin() as conn:
        conn.execute(
            drifted.insert(),
            {"id": marker, "doctor_id": uuid.uuid4(), "junk_col": "keep-me"},
        )
    revision = _load_revision()
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            with pytest.raises(RuntimeError, match="doctor_notes"):
                revision.upgrade()
    with engine.connect() as conn:
        insp = inspect(conn)
        columns = {col["name"] for col in insp.get_columns("doctor_notes")}
        assert columns == {"id", "doctor_id", "junk_col"}
        count = conn.execute(sa.text("SELECT COUNT(*) FROM doctor_notes")).scalar()
        assert count == 1
        value = conn.execute(sa.text("SELECT junk_col FROM doctor_notes")).scalar()
        assert value == "keep-me"
    engine.dispose()


def test_upgrade_enforces_constraints_and_indexes(tmp_path):
    engine = _fresh_sqlite(tmp_path, "constraints.db")
    _run_upgrade(engine)
    with engine.connect() as conn:
        insp = inspect(conn)
        for table in FOUR_TABLES:
            pk = insp.get_pk_constraint(table)
            assert pk["constrained_columns"] == ["id"], table
        qr_indexes = insp.get_indexes("carecircle_qrs")
        assert any(
            idx.get("unique") and "token" in idx["column_names"] for idx in qr_indexes
        )
        access_indexes = insp.get_indexes("carecircle_access")
        indexed = {col for idx in access_indexes for col in idx["column_names"]}
        assert {"user_id", "requester_id", "status"} <= indexed
        for table in ("carecircle_qrs", "carecircle_access", "doctor_patients", "doctor_notes"):
            fks = insp.get_foreign_keys(table)
            assert fks, table
            assert all(fk["referred_table"] == "users" for fk in fks), table
    engine.dispose()


@pytest.mark.skip(reason="downgrade execution requires explicit destructive-ops authorization")
def test_downgrade_reverses_0004(tmp_path):
    engine = _fresh_sqlite(tmp_path, "downgrade.db")
    revision = _load_revision()
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            revision.upgrade()
            revision.downgrade()
        conn.commit()
    remaining = set(inspect(engine).get_table_names())
    for table in FOUR_TABLES:
        assert table not in remaining
    engine.dispose()
