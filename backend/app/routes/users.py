"""Current-user profile endpoints."""

from __future__ import annotations

from flask import Blueprint, g, jsonify

from app.extensions import db
from app.models.user import User
from app.serializers import serialize_user, user_stats
from app.utils.auth import jwt_required
from app.utils.validators import (
    ValidationError,
    get_json_object,
    require_text,
    validate_email,
    validate_password,
)

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("/me")
@jwt_required
def get_me():
    user = g.current_user
    return jsonify(serialize_user(user, stats=user_stats(user)))


@users_bp.patch("/me")
@jwt_required
def update_me():
    user = g.current_user
    payload = get_json_object()

    if "fullName" in payload:
        user.full_name = require_text(
            payload, "fullName", label="Họ và tên", min_length=2, max_length=120
        )
    if "studentId" in payload:
        user.student_id = require_text(
            payload, "studentId", label="Mã sinh viên", max_length=40, required=False
        )
    if "faculty" in payload:
        user.faculty = require_text(
            payload, "faculty", label="Khoa", max_length=120, required=False
        )
    if "studyYear" in payload or "year" in payload:
        key = "studyYear" if "studyYear" in payload else "year"
        user.study_year = require_text(
            payload, key, label="Năm học", max_length=40, required=False
        )

    if "email" in payload:
        email = validate_email(payload.get("email"))
        if email != user.email:
            taken = db.session.scalar(
                db.select(User.id).where(User.email == email, User.id != user.id)
            )
            if taken is not None:
                raise ValidationError(
                    "Email này đã được sử dụng bởi tài khoản khác.",
                    {"email": "Email đã tồn tại."},
                    status=409,
                    code="email_taken",
                )
            user.email = email

    if "newPassword" in payload:
        current_password = payload.get("currentPassword") or ""
        if not isinstance(current_password, str) or not user.check_password(
            current_password
        ):
            raise ValidationError(
                "Mật khẩu hiện tại không đúng.",
                {"currentPassword": "Không đúng."},
                status=400,
                code="invalid_password",
            )
        user.set_password(validate_password(payload.get("newPassword"), field="newPassword"))

    db.session.commit()
    return jsonify(serialize_user(user, stats=user_stats(user)))
