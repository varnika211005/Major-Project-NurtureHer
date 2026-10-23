"""add series_name and is_verified columns to educational_resources

Revision ID: 0011_edu_series_verified
Revises: 0010_edu_resource_lang
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_edu_series_verified"
down_revision: str | None = "0010_edu_resource_lang"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "educational_resources",
        sa.Column("series_name", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "educational_resources",
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index(
        op.f("ix_educational_resources_series_name"),
        "educational_resources",
        ["series_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_educational_resources_is_verified"),
        "educational_resources",
        ["is_verified"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_educational_resources_is_verified"), table_name="educational_resources")
    op.drop_index(op.f("ix_educational_resources_series_name"), table_name="educational_resources")
    op.drop_column("educational_resources", "is_verified")
    op.drop_column("educational_resources", "series_name")
