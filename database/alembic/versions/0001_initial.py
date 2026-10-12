"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    user_role = postgresql.ENUM("MOTHER", "CAREGIVER", "ASHA_WORKER", "ADMIN", name="user_role", create_type=False)
    mood_option = postgresql.ENUM("HAPPY", "SAD", "ANXIOUS", "TIRED", "ANGRY", name="mood_option", create_type=False)
    risk_level = postgresql.ENUM("LOW", "MODERATE", "HIGH", name="risk_level", create_type=False)
    ppd_risk_level = postgresql.ENUM("LOW", "MODERATE", "HIGH", name="ppd_risk_level", create_type=False)
    case_risk_level = postgresql.ENUM("LOW", "MODERATE", "HIGH", name="case_risk_level", create_type=False)
    case_status = postgresql.ENUM("OPEN", "RESOLVED", name="case_status", create_type=False)
    for enum in [user_role, mood_option, risk_level, ppd_risk_level, case_risk_level, case_status]:
        enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("preferred_language", sa.String(16), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "mother_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("pregnancy_status", sa.String(80), nullable=True),
        sa.Column("delivery_date", sa.Date(), nullable=True),
        sa.Column("blood_group", sa.String(8), nullable=True),
        sa.Column("emergency_contact", sa.String(32), nullable=True),
        sa.Column("district", sa.String(120), nullable=True),
        sa.Column("village", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table("moods", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("mood", mood_option, nullable=False), sa.Column("note", sa.Text(), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_moods_user_id", "moods", ["user_id"])
    op.create_table("symptoms", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("fatigue", sa.Boolean(), nullable=False), sa.Column("headache", sa.Boolean(), nullable=False), sa.Column("sleep_issue", sa.Boolean(), nullable=False), sa.Column("anxiety", sa.Boolean(), nullable=False), sa.Column("cramps", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_symptoms_user_id", "symptoms", ["user_id"])
    op.create_table("cycles", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("last_period_date", sa.Date(), nullable=False), sa.Column("cycle_length", sa.Integer(), nullable=False), sa.Column("next_period_prediction", sa.Date(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_cycles_user_id", "cycles", ["user_id"])
    op.create_table("journals", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("title", sa.String(255), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_journals_user_id", "journals", ["user_id"])

    op.create_table("pcos_predictions", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("risk_level", risk_level, nullable=False), sa.Column("probability", sa.Float(), nullable=False), sa.Column("recommendations", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_pcos_predictions_user_id", "pcos_predictions", ["user_id"])
    op.create_table("ppd_assessments", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("epds_score", sa.Integer(), nullable=False), sa.Column("sentiment", sa.String(40), nullable=False), sa.Column("risk_level", ppd_risk_level, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_ppd_assessments_user_id", "ppd_assessments", ["user_id"])
    op.create_table("chat_messages", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("message", sa.Text(), nullable=False), sa.Column("response", sa.Text(), nullable=False), sa.Column("language", sa.String(16), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])
    op.create_table("caregiver_content", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("title", sa.String(255), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("video_url", sa.String(500), nullable=True), sa.Column("category", sa.String(80), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_caregiver_content_category", "caregiver_content", ["category"])
    op.create_table("high_risk_cases", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("risk_type", sa.String(40), nullable=False), sa.Column("risk_level", case_risk_level, nullable=False), sa.Column("assigned_worker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True), sa.Column("status", case_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_high_risk_cases_user_id", "high_risk_cases", ["user_id"])
    op.create_table("alerts", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("message", sa.Text(), nullable=False), sa.Column("sent_status", sa.String(40), nullable=False), sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_alerts_user_id", "alerts", ["user_id"])
    op.create_table("audit_logs", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True), sa.Column("action", sa.String(120), nullable=False), sa.Column("resource", sa.String(120), nullable=False), sa.Column("ip_address", sa.String(64), nullable=True), sa.Column("user_agent", sa.String(500), nullable=True), sa.Column("metadata_json", sa.Text(), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_table("refresh_tokens", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("token_jti", sa.String(64), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_jti", "refresh_tokens", ["token_jti"], unique=True)


def downgrade() -> None:
    for table in ["refresh_tokens", "audit_logs", "alerts", "high_risk_cases", "caregiver_content", "chat_messages", "ppd_assessments", "pcos_predictions", "journals", "cycles", "symptoms", "moods", "mother_profiles", "users"]:
        op.drop_table(table)
    for enum_name in ["case_status", "case_risk_level", "ppd_risk_level", "risk_level", "mood_option", "user_role"]:
        postgresql.ENUM(name=enum_name).drop(op.get_bind(), checkfirst=True)
