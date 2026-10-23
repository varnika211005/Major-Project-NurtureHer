"""add language column to educational_resources

Revision ID: 0010_educational_resource_language
Revises: 0009_educational_resources
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_edu_resource_lang"
down_revision: str | None = "0009_educational_resources"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "educational_resources",
        sa.Column("language", sa.String(length=10), server_default="en", nullable=False),
    )
    op.create_index(
        op.f("ix_educational_resources_language"),
        "educational_resources",
        ["language"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_educational_resources_language"), table_name="educational_resources")
    op.drop_column("educational_resources", "language")
