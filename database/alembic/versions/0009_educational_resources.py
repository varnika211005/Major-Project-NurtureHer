"""create educational_resources table

Revision ID: 0009_educational_resources
Revises: 0008_profile_fields
Create Date: 2026-10-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_educational_resources"
down_revision: str | None = "0008_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "educational_resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("article_content", sa.Text(), nullable=True),
        sa.Column("author_publisher", sa.String(length=255), nullable=True),
        sa.Column("review_date", sa.String(length=32), nullable=True),
        sa.Column("sources_json", sa.Text(), nullable=True),
        sa.Column("is_downloadable", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_educational_resources_content_type", "educational_resources", ["content_type"])
    op.create_index("ix_educational_resources_category", "educational_resources", ["category"])


def downgrade() -> None:
    op.drop_index("ix_educational_resources_category", table_name="educational_resources")
    op.drop_index("ix_educational_resources_content_type", table_name="educational_resources")
    op.drop_table("educational_resources")
