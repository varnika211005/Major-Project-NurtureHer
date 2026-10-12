import logging
from typing import Protocol

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSProvider(Protocol):
    def send_sms(self, phone_number: str, message: str) -> bool:
        ...


class TwilioSMSProvider:
    def send_sms(self, phone_number: str, message: str) -> bool:
        if not all([settings.twilio_account_sid, settings.twilio_auth_token, settings.twilio_from_number]):
            if settings.environment.lower() == "production":
                logger.error("Twilio credentials missing in production; SMS not sent to %s", phone_number)
                return False
            logger.info("Twilio credentials missing; simulated SMS to %s: %s", phone_number, message)
            return True

        url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
        data = {"To": phone_number, "From": settings.twilio_from_number, "Body": message}
        try:
            response = httpx.post(url, data=data, auth=(settings.twilio_account_sid, settings.twilio_auth_token), timeout=15)
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            logger.exception("Twilio SMS failed: %s", exc)
            return False


class Fast2SMSProvider:
    def send_sms(self, phone_number: str, message: str) -> bool:
        if not settings.fast2sms_api_key:
            if settings.environment.lower() == "production":
                logger.error("Fast2SMS API key missing in production; SMS not sent to %s", phone_number)
                return False
            logger.info("Fast2SMS credentials missing; simulated SMS to %s: %s", phone_number, message)
            return True

        headers = {"authorization": settings.fast2sms_api_key}
        payload = {"route": "q", "message": message, "language": "english", "flash": 0, "numbers": phone_number}
        try:
            response = httpx.post("https://www.fast2sms.com/dev/bulkV2", headers=headers, data=payload, timeout=15)
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            logger.exception("Fast2SMS failed: %s", exc)
            return False


def get_sms_provider() -> SMSProvider:
    if settings.sms_provider.lower() == "fast2sms":
        return Fast2SMSProvider()
    return TwilioSMSProvider()
