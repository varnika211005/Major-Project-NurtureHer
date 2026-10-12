from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token


class AuthenticationContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request.state.user_id = None
        request.state.authenticated = False

        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            try:
                payload = decode_token(token, "access")
                request.state.user_id = payload.get("sub")
                request.state.authenticated = True
            except ValueError:
                request.state.authenticated = False

        return await call_next(request)

