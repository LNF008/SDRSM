"""Authentication endpoints: register, login, logout."""

from __future__ import annotations

import secrets

from flask import Blueprint, jsonify
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.oauth_account import OAuthAccount
from app.models.user import User
from app.serializers import serialize_user
from app.services.google_service import GoogleAuthError, verify_google_credential
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


@auth_bp.post("/google")
def google_login():
    """Sign in with a Google ID token and return an SDRSM access token."""
    payload = get_json_object()
    credential = payload.get("credential")

    if not isinstance(credential, str) or not credential.strip():
        raise ValidationError(
            "Thiếu thông tin xác thực Google.",
            {"credential": "Bắt buộc"},
            status=400,
            code="google_credential_required",
        )

    try:
        claims = verify_google_credential(credential.strip())
    except GoogleAuthError as exc:
        return error_response(exc.message, exc.status, code=exc.code)

    subject = str(claims.get("sub") or "").strip()
    email = clean_text(claims.get("email")).lower()
    if not subject or not email:
        return error_response(
            "Tài khoản Google không cung cấp đủ thông tin.",
            401,
            code="google_profile_incomplete",
        )

    try:
        email = validate_email(email)
    except ValidationError:
        return error_response(
            "Email Google không hợp lệ.",
            401,
            code="google_email_invalid",
        )

    full_name = clean_text(
        claims.get("name") or claims.get("given_name") or email.split("@")[0]
    )[:120]
    full_name = full_name or "Sinh viên SDRSM"

    picture = claims.get("picture")
    if not isinstance(picture, str) or not picture.startswith(("https://", "http://")):
        picture = None
    elif len(picture) > 500:
        picture = None

    account = db.session.scalar(
        db.select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.subject == subject,
        )
    )
    user = account.user if account is not None else None

    if user is None:
        # Link a Google identity to an existing local account with the same
        # verified email, or create a new passwordless-in-practice account.
        user = db.session.scalar(db.select(User).where(User.email == email))
        if user is None:
            user = User(full_name=full_name, email=email)
            # Keep a valid, unguessable hash so the NOT NULL column and the
            # existing password helpers keep working without a schema change.
            user.set_password(secrets.token_urlsafe(48))
            db.session.add(user)
            db.session.flush()

        account = OAuthAccount(
            user=user,
            provider="google",
            subject=subject,
            email=email,
            avatar_url=picture,
        )
        db.session.add(account)
    else:
        account.email = email
        account.avatar_url = picture or account.avatar_url
        if not user.full_name:
            user.full_name = full_name

    try:
        db.session.commit()
    except IntegrityError:
        # A concurrent first sign-in may have created the same link.
        db.session.rollback()
        account = db.session.scalar(
            db.select(OAuthAccount).where(
                OAuthAccount.provider == "google",
                OAuthAccount.subject == subject,
            )
        )
        if account is None:
            raise
        user = account.user

    return jsonify(_auth_payload(user))
