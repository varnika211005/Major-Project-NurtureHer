"""add profile fields to users for doctor and caregiver roles

Revision ID: 0008_profile_fields
Revises: 0007_doctor_patient_unique
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_profile_fields"
down_revision: str | None = "0007_doctor_patient_unique"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("specialization", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("qualifications", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("experience_years", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("hospital_clinic", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("relationship_label", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "relationship_label")
    op.drop_column("users", "hospital_clinic")
    op.drop_column("users", "experience_years")
    op.drop_column("users", "qualifications")
    op.drop_column("users", "specialization")
