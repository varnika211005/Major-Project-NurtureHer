"""Chat-driven escalation: persistent cases + caregiver/doctor notification.

Policy (escalation-policy-v1, pending clinical review):
- URGENT triage   -> open HighRiskCase + notify the assigned doctor and all
                     consented caregivers (approved CareCircle access with a
                     risk/emergency scope).
- NEEDS_ATTENTION -> open HighRiskCase only (visible in the doctor queue);
                     no SMS, to avoid alert fatigue.
- ROUTINE         -> never escalates; this module is not even called.

Cooldown/dedup: an already-OPEN chat_triage case for the same mother created
within the last 24h is reused; no duplicate case or alerts are created.

The mother's urgent-care reply never waits for any of this: escalation runs
after the reply is persisted, and any escalation failure is logged without
breaking the chat response.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asha import HighRiskCase
from app.models.carecircle import CareCircleAccess
from app.models.doctor import DoctorPatient
from app.models.enums import CaseStatus, RiskLevel
from app.models.user import User
from app.repositories.health import HighRiskRepository
from app.services.notification import NotificationService
from app.services.triage import TRIAGE_RULES_VERSION, TriageLevel

logger = logging.getLogger(__name__)

ESCALATION_POLICY_VERSION = "escalation-policy-v1"
ESCALATION_REVIEW_STATUS = "pending-clinical-review"
RISK_TYPE = "chat_triage"
COOLDOWN_HOURS = 24
EXCERPT_CHARS = 500


@dataclass
class EscalationResult:
    created: bool
    case_id: UUID | None = None
    notified_user_ids: list[UUID] = field(default_factory=list)
    skipped_no_phone: list[UUID] = field(default_factory=list)
    unassigned_doctor: bool = False
    reason: str = ""


async def _recent_open_case(db: AsyncSession, user_id: UUID) -> HighRiskCase | None:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=COOLDOWN_HOURS)
    result = await db.execute(
        select(HighRiskCase).where(
            HighRiskCase.user_id == user_id,
            HighRiskCase.risk_type == RISK_TYPE,
            HighRiskCase.status == CaseStatus.OPEN,
            HighRiskCase.created_at >= cutoff,
        )
    )
    return result.scalars().first()


async def _assigned_doctor(db: AsyncSession, mother_id: UUID) -> User | None:
    link = (
        await db.execute(
            select(DoctorPatient).where(
                DoctorPatient.patient_id == mother_id,
                DoctorPatient.status == "active",
            )
        )
    ).scalars().first()
    if link is None:
        return None
    return await db.get(User, link.doctor_id)


async def _consented_caregivers(db: AsyncSession, mother_id: UUID) -> list[User]:
    rows = (
        await db.execute(
            select(CareCircleAccess).where(
                CareCircleAccess.user_id == mother_id,
                CareCircleAccess.status == "approved",
                (CareCircleAccess.share_emergency.is_(True))
                | (CareCircleAccess.share_risk_category.is_(True)),
            )
        )
    ).scalars().all()
    caregivers = []
    for row in rows:
        user = await db.get(User, row.requester_id)
        if user is not None and user.is_active:
            caregivers.append(user)
    return caregivers


def _alert_text(mother_name: str, level: TriageLevel, kind: str, excerpt: str) -> str:
    trimmed = " ".join(excerpt.split())[:EXCERPT_CHARS]
    return (
        f"NurtureHer escalation ({level.value}, {ESCALATION_POLICY_VERSION} "
        f"triage={TRIAGE_RULES_VERSION}): {mother_name} flagged {kind}. "
        f"Trigger excerpt: {trimmed}. "
        "Please review in the doctor escalation queue. "
        "The mother was already advised to seek urgent care immediately; do not wait."
    )


async def escalate_from_chat(
    db: AsyncSession,
    *,
    user: User,
    level: TriageLevel,
    kind: str,
    trigger_message: str,
) -> EscalationResult:
    """Open a case and notify per policy. Never raises for data issues."""
    if level == TriageLevel.ROUTINE:
        return EscalationResult(created=False, reason="routine messages never escalate")
    existing = await _recent_open_case(db, user.id)
    if existing is not None:
        logger.info(
            "Chat escalation deduped user=%s case=%s (cooldown %dh)",
            user.id, existing.id, COOLDOWN_HOURS,
        )
        return EscalationResult(created=False, case_id=existing.id, reason="cooldown: reused open case")
    risk_level = RiskLevel.HIGH if level == TriageLevel.URGENT else RiskLevel.MODERATE
    case = await HighRiskRepository(db).create(
        user_id=user.id,
        risk_type=RISK_TYPE,
        risk_level=risk_level,
        assigned_worker_id=None,
    )
    await db.commit()
    result = EscalationResult(created=True, case_id=case.id)
    if level != TriageLevel.URGENT:
        result.reason = "needs-attention: case opened without notifications per policy"
        logger.info("Chat escalation case-only user=%s case=%s", user.id, case.id)
        return result
    recipients: list[User] = []
    doctor = await _assigned_doctor(db, user.id)
    if doctor is None:
        result.unassigned_doctor = True
    else:
        recipients.append(doctor)
    recipients.extend(await _consented_caregivers(db, user.id))
    notifications = NotificationService(db)
    for recipient in recipients:
        await notifications.queue_sms_alert(
            recipient, _alert_text(user.name, level, kind, trigger_message)
        )
        await db.commit()
        if recipient.phone:
            result.notified_user_ids.append(recipient.id)
        else:
            result.skipped_no_phone.append(recipient.id)
    result.reason = (
        f"urgent: case opened, {len(result.notified_user_ids)} notified, "
        f"{len(result.skipped_no_phone)} skipped (no phone)"
    )
    logger.info("Chat escalation urgent user=%s case=%s notified=%d", user.id, case.id, len(result.notified_user_ids))
    return result
