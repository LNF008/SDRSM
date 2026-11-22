"""Google Identity Services sign-in tests."""

from __future__ import annotations

from app.models.user import User
from app.services.google_service import GoogleAuthError
from tests.conftest import TEST_EMAIL, TEST_PASSWORD, register_user

GOOGLE_EMAIL = "google.student@example.edu.vn"
GOOGLE_CLAIMS = {
    "sub": "109876543210987654321",
    "email": GOOGLE_EMAIL,
    "email_verified": True,
    "name": "Google Student",
    "picture": "https://lh3.googleusercontent.com/a/example",
    "iss": "https://accounts.google.com",
}


def patch_google(monkeypatch, claims=None, error=None):
    def fake_verify(credential):
        assert credential
        if error is not None:
            raise error
        return dict(claims or GOOGLE_CLAIMS)

    monkeypatch.setattr("app.routes.auth.verify_google_credential", fake_verify)


def test_google_login_creates_account_and_returns_working_token(
    client, app, monkeypatch
):
    patch_google(monkeypatch)

    response = client.post("/api/auth/google", json={"credential": "fake-id-token"})
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert body["tokenType"] == "Bearer"
    assert body["user"]["email"] == GOOGLE_EMAIL
    assert body["user"]["authProvider"] == "google"
    assert body["user"]["hasGoogle"] is True
    assert body["user"]["avatarUrl"] == GOOGLE_CLAIMS["picture"]

    me = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {body['token']}"},
    )
    assert me.status_code == 200
    assert me.get_json()["email"] == GOOGLE_EMAIL

    with app.app_context():
        assert db_user_count() == 1


def test_google_login_reuses_account_by_subject(client, app, monkeypatch):
    patch_google(monkeypatch)

    first = client.post("/api/auth/google", json={"credential": "token-1"}).get_json()
    second = client.post("/api/auth/google", json={"credential": "token-2"}).get_json()

    assert first["user"]["id"] == second["user"]["id"]
    with app.app_context():
        assert db_user_count() == 1


def test_google_login_links_existing_local_account(client, app, monkeypatch):
    registered = register_user(client).get_json()
    local_id = registered["user"]["id"]
    assert registered["user"]["authProvider"] == "local"

    patch_google(
        monkeypatch,
        claims={**GOOGLE_CLAIMS, "email": TEST_EMAIL, "name": "Nguyễn Văn An"},
    )
    response = client.post("/api/auth/google", json={"credential": "fake-id-token"})
    assert response.status_code == 200, response.get_json()
    body = response.get_json()

    assert body["user"]["id"] == local_id
    assert body["user"]["hasGoogle"] is True
    assert body["user"]["authProvider"] == "google"

    # The local password still works after linking Google.
    login = client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert login.status_code == 200

    with app.app_context():
        assert db_user_count() == 1


def test_google_login_requires_credential(client):
    response = client.post("/api/auth/google", json={})
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "google_credential_required"


def test_google_login_rejects_invalid_token(client, monkeypatch):
    patch_google(
        monkeypatch,
        error=GoogleAuthError(
            "Phiên đăng nhập Google không hợp lệ.",
            status=401,
            code="google_token_invalid",
        ),
    )
    response = client.post("/api/auth/google", json={"credential": "bad-token"})
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "google_token_invalid"


def test_google_login_reports_missing_configuration(client, app):
    app.config["GOOGLE_CLIENT_ID"] = ""
    response = client.post("/api/auth/google", json={"credential": "any-token"})
    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "google_not_configured"


def db_user_count() -> int:
    from app.extensions import db

    return db.session.scalar(db.select(db.func.count(User.id)))
