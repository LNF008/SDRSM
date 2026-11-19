"""Dashboard aggregation tests."""

from __future__ import annotations

from tests.conftest import answer_all


def _submit(client, headers, catalog, index):
    response = client.post(
        "/api/assessments",
        json={"answers": answer_all(catalog, index)},
        headers=headers,
    )
    assert response.status_code == 201
    return response.get_json()


def test_dashboard_empty_state(client, auth_headers):
    response = client.get("/api/dashboard", headers=auth_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["hasAssessment"] is False
    assert body["latest"] is None
    assert body["history"] == []
    assert body["trend"] == []
    assert body["recommendations"]["items"] == []
    assert body["user"]["assessmentCount"] == 0


def test_dashboard_after_assessment(client, auth_headers, catalog):
    risky = _submit(client, auth_headers, catalog, 0)
    safe = _submit(client, auth_headers, catalog, 3)

    response = client.get("/api/dashboard", headers=auth_headers)
    assert response.status_code == 200
    body = response.get_json()

    assert body["hasAssessment"] is True
    assert body["latest"]["id"] == safe["id"]
    assert body["user"]["assessmentCount"] == 2
    assert len(body["history"]) == 2
    assert body["history"][0]["id"] == safe["id"]
    assert body["history"][0]["previousScore"] == risky["overallRisk"]

    assert body["comparison"]["previous"] == risky["overallRisk"]
    assert body["comparison"]["delta"] == safe["overallRisk"] - risky["overallRisk"]
    assert body["comparison"]["improved"] is True

    assert len(body["trend"]) == 2
    assert body["trend"][-1]["id"] == safe["id"]
    assert body["trend"][0]["id"] == risky["id"]

    assert body["recommendations"]["assessmentId"] == safe["id"]
    assert body["recommendations"]["stats"]["total"] >= len(
        body["recommendations"]["items"]
    )

    assert body["notifications"]
    assert body["activity"]
    assert any("giảm" in item["title"] for item in body["notifications"])
