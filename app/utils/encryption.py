import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.encryption_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_text(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()

