"""Shared pytest fixtures."""

from __future__ import annotations

import pytest

from app import create_app
from app.extensions import db
from app.seed import seed_catalog

TEST_PASSWORD = "Matkhau123"
TEST_EMAIL = "sinhvien@example.edu.vn"
TEST_NAME = "Nguyễn Văn An"


@pytest.fixture()
def app(tmp_path):
    database = tmp_path / "sdrsm-test.db"
    application = create_app(
        "testing",
        {"SQLALCHEMY_DATABASE_URI": f"sqlite:///{database.as_posix()}"},
    )
    with application.app_context():
        db.drop_all()
        db.create_all()
        seed_catalog()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register_user(
    client,
    *,
    email: str = TEST_EMAIL,
    password: str = TEST_PASSWORD,
    full_name: str = TEST_NAME,
):
    return client.post(
        "/api/auth/register",
        json={
            "fullName": full_name,
            "email": email,
            "password": password,
            "studentId": "21510001",
            "faculty": "Công nghệ thông tin",
            "studyYear": "Năm 3",
        },
    )


@pytest.fixture()
def auth_headers(client):
    response = register_user(client)
    assert response.status_code == 201, response.get_json()
    token = response.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def catalog(client):
    response = client.get("/api/assessments/catalog")
    assert response.status_code == 200
    return response.get_json()


def answer_all(catalog: dict, option_index: int = 0) -> dict[str, int]:
    return {question["code"]: option_index for question in catalog["questions"]}


@pytest.fixture()
def answers(catalog):
    return answer_all(catalog, 0)
