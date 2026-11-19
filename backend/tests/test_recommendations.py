"""Recommendation listing, filtering and completion tests."""

from __future__ import annotations

from tests.conftest import answer_all, register_user


def _submit(client, headers, catalog, index=0):
    response = client.post(
        "/api/assessments",
        json={"answers": answer_all(catalog, index)},
        headers=headers,
    )
    assert response.status_code == 201
    return response.get_json()


def test_empty_recommendations_before_assessment(client, auth_headers):
    response = client.get("/api/recommendations", headers=auth_headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body["items"] == []
    assert body["stats"] == {"total": 0, "done": 0, "open": 0, "criticalOpen": 0}
    assert body["assessmentId"] is None


def test_list_and_complete_recommendation(client, auth_headers, catalog):
    _submit(client, auth_headers, catalog, 0)

    listing = client.get("/api/recommendations", headers=auth_headers)
    assert listing.status_code == 200
    body = listing.get_json()
    assert body["items"]
    assert body["stats"]["total"] == len(body["items"])
    assert body["stats"]["done"] == 0

    first = body["items"][0]
    assert first["code"].startswith("R-")
    assert first["priority"] in {"critical", "high", "medium", "low"}
    assert first["pillarId"] in {"p1", "p2", "p3", "p4", "p5"}
    assert first["pillar"]["name"]
    assert first["done"] is False

    updated = client.patch(
        f"/api/recommendations/{first['id']}",
        json={"done": True},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    updated_body = updated.get_json()
    assert updated_body["item"]["done"] is True
    assert updated_body["item"]["doneAt"]
    assert updated_body["stats"]["done"] == 1
    assert updated_body["stats"]["open"] == body["stats"]["total"] - 1

    done = client.get(
        "/api/recommendations?status=done", headers=auth_headers
    ).get_json()
    assert done["total"] == 1
    assert done["items"][0]["id"] == first["id"]

    open_items = client.get(
        "/api/recommendations?status=open", headers=auth_headers
    ).get_json()
    assert all(item["done"] is False for item in open_items["items"])

    reopened = client.patch(
        f"/api/recommendations/{first['id']}",
        json={"done": False},
        headers=auth_headers,
    ).get_json()
    assert reopened["item"]["done"] is False
    assert reopened["item"]["doneAt"] is None


def test_recommendation_filters(client, auth_headers, catalog):
    _submit(client, auth_headers, catalog, 0)

    critical = client.get(
        "/api/recommendations?priority=critical", headers=auth_headers
    )
    assert critical.status_code == 200
    assert all(item["priority"] == "critical" for item in critical.get_json()["items"])

    pillar = client.get(
        "/api/recommendations?pillarId=p4", headers=auth_headers
    ).get_json()
    assert pillar["items"]
    assert all(item["pillarId"] == "p4" for item in pillar["items"])

    invalid = client.get(
        "/api/recommendations?priority=urgent", headers=auth_headers
    )
    assert invalid.status_code == 422


def test_cannot_update_another_users_recommendation(client, auth_headers, catalog):
    _submit(client, auth_headers, catalog, 0)
    item = client.get("/api/recommendations", headers=auth_headers).get_json()["items"][0]

    other = register_user(client, email="other@example.edu.vn")
    other_headers = {"Authorization": f"Bearer {other.get_json()['token']}"}

    response = client.patch(
        f"/api/recommendations/{item['id']}",
        json={"done": True},
        headers=other_headers,
    )
    assert response.status_code == 404


def test_completion_carries_over_to_next_assessment(client, auth_headers, catalog):
    _submit(client, auth_headers, catalog, 0)
    item = client.get("/api/recommendations", headers=auth_headers).get_json()["items"][0]
    client.patch(
        f"/api/recommendations/{item['id']}",
        json={"done": True},
        headers=auth_headers,
    )

    _submit(client, auth_headers, catalog, 0)
    latest = client.get("/api/recommendations", headers=auth_headers).get_json()
    matching = [entry for entry in latest["items"] if entry["code"] == item["code"]]
    assert matching and matching[0]["done"] is True
