"""Authentication and profile tests."""

from __future__ import annotations

from tests.conftest import TEST_EMAIL, TEST_PASSWORD, register_user


def test_register_login_and_current_user(client):
    response = register_user(client)
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["tokenType"] == "Bearer"
    assert payload["expiresIn"] > 0
    assert payload["user"]["email"] == TEST_EMAIL
    assert payload["user"]["fullName"]
    assert payload["user"]["initials"]

    login = client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert login.status_code == 200
    token = login.get_json()["token"]

    me = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.get_json()
    assert body["email"] == TEST_EMAIL
    assert body["assessmentCount"] == 0
    assert body["plan"] == "Tài khoản sinh viên"


def test_duplicate_email_is_rejected(client):
    assert register_user(client).status_code == 201
    duplicate = register_user(client)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "email_taken"


def test_invalid_registration_payloads(client):
    weak = client.post(
        "/api/auth/register",
        json={"fullName": "A", "email": "not-an-email", "password": "123"},
    )
    assert weak.status_code == 422
    fields = weak.get_json()["error"]["fields"]
    assert "email" in fields
    assert "password" in fields


def test_wrong_credentials_return_401(client):
    assert register_user(client).status_code == 201
    response = client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": "WrongPass123"},
    )
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "invalid_credentials"


def test_protected_routes_require_token(client):
    response = client.get("/api/users/me")
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "unauthorized"

    bad = client.get("/api/users/me", headers={"Authorization": "Bearer nonsense"})
    assert bad.status_code == 401
    assert bad.get_json()["error"]["code"] == "invalid_token"


def test_update_profile_and_password(client, auth_headers):
    update = client.patch(
        "/api/users/me",
        json={"fullName": "Trần Thị Bình", "faculty": "Kinh tế", "year": "Năm 4"},
        headers=auth_headers,
    )
    assert update.status_code == 200
    body = update.get_json()
    assert body["fullName"] == "Trần Thị Bình"
    assert body["faculty"] == "Kinh tế"
    assert body["year"] == "Năm 4"

    wrong = client.patch(
        "/api/users/me",
        json={"currentPassword": "sai-mat-khau", "newPassword": "Matkhau456"},
        headers=auth_headers,
    )
    assert wrong.status_code == 400

    changed = client.patch(
        "/api/users/me",
        json={"currentPassword": TEST_PASSWORD, "newPassword": "Matkhau456"},
        headers=auth_headers,
    )
    assert changed.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"email": TEST_EMAIL, "password": "Matkhau456"},
    )
    assert login.status_code == 200


def test_logout(client, auth_headers):
    response = client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json()["message"]
