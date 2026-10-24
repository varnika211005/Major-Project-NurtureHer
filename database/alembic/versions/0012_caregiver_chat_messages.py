"""add caregiver_chat_messages table for isolated caregiver chatbot

Revision ID: 0012_caregiver_chat_messages
Revises: 0011_edu_series_verified
Create Date: 2026-10-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_caregiver_chat_messages"
down_revision: str | None = "0011_edu_series_verified"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "caregiver_chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("caregiver_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mother_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("response", sa.Text(), nullable=False),
        sa.Column("sources", sa.Text(), nullable=True),
        sa.Column("language", sa.String(length=16), server_default="en", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_caregiver_chat_messages_caregiver_id"),
        "caregiver_chat_messages",
        ["caregiver_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_caregiver_chat_messages_mother_id"),
        "caregiver_chat_messages",
        ["mother_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_caregiver_chat_messages_mother_id"), table_name="caregiver_chat_messages")
    op.drop_index(op.f("ix_caregiver_chat_messages_caregiver_id"), table_name="caregiver_chat_messages")
    op.drop_table("caregiver_chat_messages")
