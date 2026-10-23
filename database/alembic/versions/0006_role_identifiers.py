"""add role identifiers and verification fields to users

Revision ID: 0006_role_identifiers
Revises: 0005_role_specific_nutrition
Create Date: 2026-10-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_role_identifiers"
down_revision: str | None = "0005_role_specific_nutrition"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("custom_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("medical_license", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("assigned_doctor_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("assigned_mother_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))

    op.create_index("ix_users_custom_id", "users", ["custom_id"], unique=True)
    op.create_index("ix_users_medical_license", "users", ["medical_license"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_medical_license", table_name="users")
    op.drop_index("ix_users_custom_id", table_name="users")

    op.drop_column("users", "age")
    op.drop_column("users", "assigned_mother_id")
    op.drop_column("users", "assigned_doctor_id")
    op.drop_column("users", "medical_license")
    op.drop_column("users", "custom_id")
