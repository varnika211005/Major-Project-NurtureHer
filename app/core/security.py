from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


class UserRole(str, Enum):
    MOTHER = "mother"
    CAREGIVER = "caregiver"
    DOCTOR = "doctor"
    ADMIN = "admin"


def is_legacy_role_lookup_error(exc: LookupError) -> bool:
    """True only for SQLAlchemy's enum-conversion LookupError raised while
    loading a users.role value that UserRole no longer defines (legacy
    'ASHA_WORKER' rows). Deliberately narrow so any other LookupError
    propagates untouched."""
    message = str(exc)
    return "is not among the defined enum values" in message and "Enum name: user_role" in message


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_token(subject: UUID | str, token_type: str, expires_delta: timedelta, jti: str | None = None) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": str(subject), "type": token_type, "exp": expire}
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: UUID | str, jti: str | None = None) -> str:
    return create_token(subject, "access", timedelta(minutes=settings.access_token_expire_minutes), jti)


def create_refresh_token(subject: UUID | str, jti: str | None = None) -> str:
    return create_token(subject, "refresh", timedelta(days=settings.refresh_token_expire_days), jti)


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    if payload.get("type") != expected_type:
        raise ValueError("Invalid token type")
    return payload
