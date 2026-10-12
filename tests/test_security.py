import uuid

from app.core.security import create_access_token, decode_token


def test_access_token_round_trip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    payload = decode_token(token, "access")
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"

