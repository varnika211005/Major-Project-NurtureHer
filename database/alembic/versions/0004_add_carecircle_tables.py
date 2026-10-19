"""Add CareCircle/doctor tables missing from earlier revisions + chat-history scope.

Tables carecircle_qrs, carecircle_access, doctor_patients, doctor_notes exist
in SQLAlchemy models but were never created by revisions 0001-0003; application
startup (Base.metadata.create_all, IF NOT EXISTS semantics) may already have
materialized them on some databases. This revision therefore reconciles instead
of blindly creating:

- table absent                       -> create it mirroring the current models
- table present with expected schema  -> no-op (except the scope column below)
- carecircle_access missing ONLY share_chat_history
                                      -> add the column + backfill existing rows to false
- any other schema difference        -> raise with an explicit message; a human
                                        reconciles instead of auto-migrating

carecircle_access.share_chat_history defaults to False (no sharing) and is not
referenced by any route or enforcement check until a later phase.

Downgrade drops the four tables in reverse dependency order. It is destructive
by nature: only run against disposable databases with explicit authorization.
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_add_carecircle_tables"
down_revision = "0003_deactivate_asha_role"
branch_labels = None
depends_on = None


def _base_columns() -> list:
    return [
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    ]


TABLE_SPECS: dict[str, list] = {
    "carecircle_qrs": [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token", sa.String(128), unique=True, index=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        *_base_columns(),
    ],
    "carecircle_access": [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "requester_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("relationship_label", sa.String(64), nullable=True),
        sa.Column("status", sa.String(32), nullable=True, index=True),
        sa.Column("share_emergency", sa.Boolean(), nullable=True),
        sa.Column("share_risk_category", sa.Boolean(), nullable=True),
        sa.Column("share_wellness_summary", sa.Boolean(), nullable=True),
        sa.Column("share_doctor_notes", sa.Boolean(), nullable=True),
        sa.Column("share_chat_history", sa.Boolean(), nullable=True),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        *_base_columns(),
    ],
    "doctor_patients": [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "doctor_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "patient_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        *_base_columns(),
    ],
    "doctor_notes": [
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "doctor_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "patient_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("clinical_observations", sa.Text(), nullable=False),
        sa.Column("follow_up_recommendation", sa.Text(), nullable=True),
        sa.Column("prescribed_advice", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        *_base_columns(),
    ],
}

# The only schema delta this revision repairs on pre-existing tables.
RECONCILABLE_COLUMNS: dict[str, set[str]] = {
    "carecircle_access": {"share_chat_history"},
}


def _expected_names(table_name: str) -> set[str]:
    return {col.name for col in TABLE_SPECS[table_name]}


def _reconcile_table(inspector, table_name: str) -> None:
    expected = _expected_names(table_name)
    found = {col["name"] for col in inspector.get_columns(table_name)}
    missing = expected - found
    extra = found - expected
    allowed = RECONCILABLE_COLUMNS.get(table_name, set())
    if missing <= allowed and not extra:
        for column_name in sorted(missing):
            column = next(col for col in TABLE_SPECS[table_name] if col.name == column_name)
            op.add_column(table_name, column)
            if table_name == "carecircle_access" and column_name == "share_chat_history":
                op.execute(
                    sa.text(
                        "UPDATE carecircle_access "
                        "SET share_chat_history = false "
                        "WHERE share_chat_history IS NULL"
                    )
                )
        print(f"0004: reconciled {table_name} (added {sorted(missing)}, backfilled to false)")
        return
    if not missing and not extra:
        print(f"0004: {table_name} already matches expected schema; no-op")
        return
    raise RuntimeError(
        f"migration 0004 refuses to auto-migrate {table_name!r}: "
        f"missing columns {sorted(missing - allowed)}, "
        f"unexpected columns {sorted(extra)}. "
        "Reconcile manually, then re-run."
    )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    for table_name, columns in TABLE_SPECS.items():
        if table_name not in existing:
            op.create_table(table_name, *columns)
            print(f"0004: created table {table_name}")
        else:
            _reconcile_table(inspector, table_name)


def downgrade() -> None:
    # Destructive: drops the four tables created above. Run only against
    # disposable databases with explicit authorization.
    op.drop_table("doctor_notes")
    op.drop_table("doctor_patients")
    op.drop_table("carecircle_access")
    op.drop_table("carecircle_qrs")
