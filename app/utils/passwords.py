import re

from fastapi import status

from app.core.exceptions import AppError


def validate_password_policy(password: str) -> None:
    if len(password) < 8:
        raise AppError("Password must be at least 8 characters long", status.HTTP_422_UNPROCESSABLE_ENTITY)
    checks = [
        (r"[A-Z]", "one uppercase letter"),
        (r"[a-z]", "one lowercase letter"),
        (r"\d", "one number"),
        (r"[^A-Za-z0-9]", "one special character"),
    ]
    missing = [label for pattern, label in checks if not re.search(pattern, password)]
    if missing:
        raise AppError(f"Password must contain {', '.join(missing)}", status.HTTP_422_UNPROCESSABLE_ENTITY)

