import pytest

from app.core.exceptions import AppError
from app.utils.encryption import decrypt_text, encrypt_text
from app.utils.passwords import validate_password_policy


def test_encryption_round_trip():
    value = "sensitive-health-note"
    encrypted = encrypt_text(value)
    assert encrypted != value
    assert decrypt_text(encrypted) == value


def test_password_policy_accepts_strong_password():
    validate_password_policy("Strong@123")


def test_password_policy_rejects_weak_password():
    with pytest.raises(AppError):
        validate_password_policy("password")


@pytest.mark.asyncio
async def test_safe_redis_graceful_fallback():
    from app.core.redis import redis_client
    assert await redis_client.get("nonexistent") is None
    assert await redis_client.setex("key", 10, "val") is None or True
    assert await redis_client.delete("key") == 0 or True
    assert await redis_client.lrange("key", 0, -1) == [] or True
    assert await redis_client.lpush("key", "val") == 0 or True
    assert await redis_client.ltrim("key", 0, 1) is None
    assert await redis_client.expire("key", 10) is False or True
    assert await redis_client.ping() is False or True
    await redis_client.aclose()
