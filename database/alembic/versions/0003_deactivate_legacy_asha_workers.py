"""deactivate legacy ASHA worker accounts

Revision ID: 0003_deactivate_legacy_asha_workers
Revises: 0002_production_indexes
Create Date: 2026-10-12

The ASHA Worker application role has been removed. Existing user rows with
role='asha_worker' must no longer be able to authenticate, but their records
(and every high-risk case, alert, journal, and screening row linked to them)
are preserved untouched: no rows are deleted and no role is reassigned.

Because the Python UserRole enum no longer contains ASHA_WORKER, leaving such
rows active would raise on row load at login time. Setting is_active=false
keeps the data while cleanly blocking authentication. The PostgreSQL enum
label itself is intentionally left in place: dropping an enum value cannot
run inside alembic's transaction block on all supported versions, and the
leftover label is harmless once no active rows reference it.

To apply: alembic upgrade head. To verify: SELECT id, email, is_active FROM
users WHERE role = 'asha_worker'; all rows must have is_active = false.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_deactivate_legacy_asha_workers"
down_revision: str | None = "0002_production_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE users SET is_active = false WHERE role = 'asha_worker'")


def downgrade() -> None:
    # Intentional no-op: re-activating accounts automatically would silently
    # restore access to a removed role. Restore individually if ever needed.
    pass
