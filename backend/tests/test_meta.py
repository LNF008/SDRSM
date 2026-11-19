"""Health, CORS, encoding and error-envelope tests."""

from __future__ import annotations


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["service"] == "sdrsm-api"


def test_cors_preflight_is_allowed(client):
    response = client.options(
        "/api/assessments",
        headers={
            "Origin": "http://localhost:8000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )
    assert response.status_code in (200, 204)
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    assert "Authorization" in response.headers["Access-Control-Allow-Headers"]
    assert "POST" in response.headers["Access-Control-Allow-Methods"]


def test_vietnamese_json_is_not_escaped(client):
    response = client.get("/api/assessments/catalog")
    text = response.data.decode("utf-8")
    assert "Tài khoản" in text
    assert "\\u" not in text


def test_unknown_api_route_returns_json_404(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    body = response.get_json()
    assert body["error"]["code"] == "not_found"


def test_unsupported_method_returns_json_405(client):
    response = client.delete("/api/health")
    assert response.status_code == 405
    assert response.get_json()["error"]["code"] == "method_not_allowed"
