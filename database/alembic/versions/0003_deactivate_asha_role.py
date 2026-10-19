"""Deactivate legacy ASHA Worker rows and restore the missing DOCTOR label.

Revision ID: 0003_deactivate_asha_role
Revises: 0002_production_indexes
Create Date: 2026-10-18

The ASHA Worker application role has been removed. Existing user rows with
role='ASHA_WORKER' must no longer be able to authenticate, but their records
(and every high-risk case, alert, journal, and screening row linked to them)
are preserved untouched: no rows are deleted and no role is reassigned.

Because the Python UserRole enum no longer contains ASHA_WORKER, loading
such a row raises LookupError at row-load time, which would surface as a
500 on login and on any authenticated request. Setting is_active=false
keeps the data while the application-side auth guards
(app/core/dependencies.py, app/services/auth.py) treat such rows exactly
like inactive or missing users. The PostgreSQL enum label itself is
intentionally left in place: dropping an enum value cannot run inside
alembic's transaction block on all supported versions, and the leftover
label is harmless once no active rows reference it.

Revision 0001 also created the user_role enum without the DOCTOR label even
though UserRole.DOCTOR is supported, so every doctor insert against
PostgreSQL failed with "invalid input value for enum user_role". The label
is added here, guarded by a pg_enum catalog check so the statement is
idempotent. PostgreSQL >= 12 permits ALTER TYPE ... ADD VALUE inside a
transaction (verified on the deployment's PostgreSQL 16); nothing in this
transaction uses the new label before commit, which PostgreSQL would reject
with "unsafe use of new value".

On PostgreSQL the deactivation UPDATE runs only when the 'ASHA_WORKER'
label exists: if it does not, no row can hold that value and the literal
comparison itself would fail with "invalid input value for enum". Other
dialects (SQLite in tests) store role as plain text, so the UPDATE always
runs there. The statement only re-asserts is_active=false, so re-running it
after an interrupted upgrade is safe.

To apply: alembic upgrade head. To verify:

    SELECT id, email, is_active FROM users WHERE role = 'ASHA_WORKER';
    -- every row must have is_active = false; use the uppercase label,
    -- PostgreSQL enum literals are case-sensitive

    SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'DOCTOR';
    -- must return one row
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_deactivate_asha_role"
down_revision: str | None = "0002_production_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum_has_label(bind, enum_name: str, label: str) -> bool:
    """True when the PostgreSQL enum already carries the given label."""
    row = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_enum e "
            "JOIN pg_type t ON t.oid = e.enumtypid "
            "JOIN pg_namespace n ON n.oid = t.typnamespace "
            "WHERE n.nspname = current_schema() "
            "AND t.typname = :enum_name "
            "AND e.enumlabel = :label"
        ),
        {"enum_name": enum_name, "label": label},
    ).first()
    return row is not None


def _deactivate_legacy_rows() -> None:
    op.execute(sa.text("UPDATE users SET is_active = false WHERE role = 'ASHA_WORKER'"))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        if not _enum_has_label(bind, "user_role", "DOCTOR"):
            op.execute(sa.text("ALTER TYPE user_role ADD VALUE 'DOCTOR'"))
        if _enum_has_label(bind, "user_role", "ASHA_WORKER"):
            _deactivate_legacy_rows()
        # else: the label does not exist, so no row can reference it.
    else:
        _deactivate_legacy_rows()


def downgrade() -> None:
    # Intentional no-op, for both statements:
    # - re-activating accounts automatically would silently restore access
    #   to a removed role; restore individually if ever needed
    # - the DOCTOR label must stay: the application enum requires it
    pass
