"""Google Identity Services credential verification.

The browser signs the user in with Google Identity Services and posts the
resulting ID token to the backend. No OAuth client secret is needed: the token
is verified against Google's public keys, the configured client ID and the
issuer. See https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
"""

from __future__ import annotations

from flask import current_app

GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(Exception):
    """A Google credential could not be accepted."""

    def __init__(self, message: str, status: int = 401, code: str = "google_auth_failed"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims."""
    client_id = str(current_app.config.get("GOOGLE_CLIENT_ID") or "").strip()
    if not client_id:
        raise GoogleAuthError(
            "Đăng nhập Google chưa được cấu hình trên máy chủ.",
            status=503,
            code="google_not_configured",
        )

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:  # pragma: no cover - only on a broken install
        current_app.logger.error("google-auth is not installed: %s", exc)
        raise GoogleAuthError(
            "Máy chủ thiếu thư viện xác thực Google.",
            status=503,
            code="google_dependency_missing",
        ) from exc

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
        )
    except Exception as exc:  # google-auth raises ValueError for bad tokens
        current_app.logger.warning("Google ID token rejected: %s", exc)
        raise GoogleAuthError(
            "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
            status=401,
            code="google_token_invalid",
        ) from exc

    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleAuthError(
            "Google ID token có nguồn gốc không hợp lệ.",
            status=401,
            code="google_issuer_invalid",
        )

    verified = claims.get("email_verified")
    if verified not in (True, "true", "True", 1):
        raise GoogleAuthError(
            "Email Google chưa được xác minh.",
            status=401,
            code="google_email_unverified",
        )

    if not claims.get("email") or not claims.get("sub"):
        raise GoogleAuthError(
            "Tài khoản Google không cung cấp đủ thông tin.",
            status=401,
            code="google_profile_incomplete",
        )

    return claims
