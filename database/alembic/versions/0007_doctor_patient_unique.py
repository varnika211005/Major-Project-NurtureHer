"""add partial unique index to doctor_patients for active assignments

Revision ID: 0007_doctor_patient_unique
Revises: 0006_role_identifiers
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_doctor_patient_unique"
down_revision: str | None = "0006_role_identifiers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Partial unique index ensuring a doctor cannot have duplicate active assignments for the same patient
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_active "
                "ON doctor_patients (doctor_id, patient_id) "
                "WHERE status = 'active' AND deleted_at IS NULL"
            )
        )
    else:
        # SQLite / other dialects
        op.execute(
            sa.text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_patients_active "
                "ON doctor_patients (doctor_id, patient_id) "
                "WHERE status = 'active' AND deleted_at IS NULL"
            )
        )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS uq_doctor_patients_active"))
