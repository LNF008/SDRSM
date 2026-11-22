"""JWT authentication helpers and the ``@jwt_required`` decorator."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from app.extensions import db
from app.models.user import User
from app.utils.responses import error_response


class AuthError(Exception):
    def __init__(self, message: str, status: int = 401, code: str = "unauthorized"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=int(current_app.config["JWT_EXPIRES_MINUTES"]))
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "iat": now,
        "exp": expires,
    }
    return jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm=current_app.config.get("JWT_ALGORITHM", "HS256"),
    )


def token_expires_in() -> int:
    return int(current_app.config["JWT_EXPIRES_MINUTES"]) * 60


def _bearer_token() -> str:
    header = request.headers.get("Authorization", "").strip()
    if not header:
        raise AuthError("Thiếu token xác thực. Hãy đăng nhập để tiếp tục.")
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise AuthError("Header Authorization phải có dạng: Bearer <token>.")
    return parts[1]


def load_user_from_request() -> User:
    token = _bearer_token()
    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=[current_app.config.get("JWT_ALGORITHM", "HS256")],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token đã hết hạn. Vui lòng đăng nhập lại.", code="token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Token không hợp lệ.", code="invalid_token") from exc

    if payload.get("type") != "access":
        raise AuthError("Token không đúng loại.", code="invalid_token")

    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError) as exc:
        raise AuthError("Token không chứa thông tin người dùng hợp lệ.", code="invalid_token") from exc

    user = db.session.get(User, user_id)
    if user is None:
        raise AuthError("Tài khoản không tồn tại hoặc đã bị xoá.", code="user_not_found")
    return user


def jwt_required(view):
    """Require a valid bearer token and expose the user as ``g.current_user``."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        try:
            g.current_user = load_user_from_request()
        except AuthError as exc:
            return error_response(exc.message, exc.status, code=exc.code)
        return view(*args, **kwargs)

    return wrapper
