"""production query indexes

Revision ID: 0002_production_indexes
Revises: 0001_initial
Create Date: 2026-07-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_production_indexes"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_moods_user_created", "moods", ["user_id", "created_at"])
    op.create_index("ix_symptoms_user_created", "symptoms", ["user_id", "created_at"])
    op.create_index("ix_cycles_user_created", "cycles", ["user_id", "created_at"])
    op.create_index("ix_journals_user_created", "journals", ["user_id", "created_at"])
    op.create_index("ix_pcos_predictions_user_created", "pcos_predictions", ["user_id", "created_at"])
    op.create_index("ix_ppd_assessments_user_created", "ppd_assessments", ["user_id", "created_at"])
    op.create_index("ix_chat_messages_user_created", "chat_messages", ["user_id", "created_at"])
    op.create_index("ix_alerts_user_created", "alerts", ["user_id", "created_at"])
    op.create_index("ix_alerts_status_created", "alerts", ["sent_status", "created_at"])
    op.create_index("ix_high_risk_cases_status_created", "high_risk_cases", ["status", "created_at"])
    op.create_index("ix_high_risk_cases_risk_created", "high_risk_cases", ["risk_level", "created_at"])
    op.create_index("ix_audit_logs_created", "audit_logs", ["created_at"])
    op.create_index("ix_users_role_active", "users", ["role", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_users_role_active", table_name="users")
    op.drop_index("ix_audit_logs_created", table_name="audit_logs")
    op.drop_index("ix_high_risk_cases_risk_created", table_name="high_risk_cases")
    op.drop_index("ix_high_risk_cases_status_created", table_name="high_risk_cases")
    op.drop_index("ix_alerts_status_created", table_name="alerts")
    op.drop_index("ix_alerts_user_created", table_name="alerts")
    op.drop_index("ix_chat_messages_user_created", table_name="chat_messages")
    op.drop_index("ix_ppd_assessments_user_created", table_name="ppd_assessments")
    op.drop_index("ix_pcos_predictions_user_created", table_name="pcos_predictions")
    op.drop_index("ix_journals_user_created", table_name="journals")
    op.drop_index("ix_cycles_user_created", table_name="cycles")
    op.drop_index("ix_symptoms_user_created", table_name="symptoms")
    op.drop_index("ix_moods_user_created", table_name="moods")
