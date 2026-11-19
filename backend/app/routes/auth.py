"""Authentication endpoints: register, login, logout."""

from __future__ import annotations

from flask import Blueprint, jsonify
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.user import User
from app.serializers import serialize_user
from app.utils.auth import create_access_token, jwt_required, token_expires_in
from app.utils.responses import error_response
from app.utils.validators import (
    ValidationError,
    clean_text,
    get_json_object,
    require_text,
    validate_email,
    validate_password,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _auth_payload(user: User) -> dict:
    return {
        "token": create_access_token(user),
        "tokenType": "Bearer",
        "expiresIn": token_expires_in(),
        "user": serialize_user(user),
    }


@auth_bp.post("/register")
def register():
    payload = get_json_object()

    errors: dict[str, str] = {}

    def capture(validator, *args, **kwargs):
        try:
            return validator(*args, **kwargs)
        except ValidationError as exc:
            errors.update(exc.fields or {"form": exc.message})
            return None

    full_name = capture(
        require_text,
        payload,
        "fullName",
        label="Họ và tên",
        min_length=2,
        max_length=120,
    )
    email = capture(validate_email, payload.get("email"))
    password = capture(validate_password, payload.get("password"))
    student_id = capture(
        require_text,
        payload,
        "studentId",
        label="Mã sinh viên",
        max_length=40,
        required=False,
    )
    faculty = capture(
        require_text, payload, "faculty", label="Khoa", max_length=120, required=False
    )
    study_year = capture(
        require_text,
        payload,
        "studyYear",
        label="Năm học",
        max_length=40,
        required=False,
    ) or capture(
        require_text,
        payload,
        "year",
        label="Năm học",
        max_length=40,
        required=False,
    )

    if errors:
        raise ValidationError(
            "Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.", errors
        )

    existing = db.session.scalar(db.select(User.id).where(User.email == email))
    if existing is not None:
        raise ValidationError(
            "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
            {"email": "Email đã tồn tại."},
            status=409,
            code="email_taken",
        )

    user = User(
        full_name=full_name or "",
        email=email,
        student_id=student_id,
        faculty=faculty,
        study_year=study_year,
    )
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ValidationError(
            "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
            {"email": "Email đã tồn tại."},
            status=409,
            code="email_taken",
        )

    return jsonify(_auth_payload(user)), 201


@auth_bp.post("/login")
def login():
    payload = get_json_object()
    email = clean_text(payload.get("email")).lower()
    password = payload.get("password")

    if not email or not isinstance(password, str) or not password:
        raise ValidationError(
            "Vui lòng nhập email và mật khẩu.",
            {"email": "Bắt buộc", "password": "Bắt buộc"},
            status=400,
        )

    user = db.session.scalar(db.select(User).where(User.email == email))
    if user is None or not user.check_password(password):
        return error_response(
            "Email hoặc mật khẩu không đúng.", 401, code="invalid_credentials"
        )

    return jsonify(_auth_payload(user))


@auth_bp.post("/logout")
@jwt_required
def logout():
    # Tokens are stateless; the client discards the token. This endpoint exists
    # so the UI can perform a single sign-out call.
    return jsonify({"message": "Đã đăng xuất."})
