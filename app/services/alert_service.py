from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.notification import NotificationService


class AlertService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.notifications = NotificationService(db)

    async def send_manual_alert(self, user: User, message: str):
        alert = await self.notifications.queue_sms_alert(user, message)
        await self.db.commit()
        return alert

