"""Assessment catalog, submission, history and report tests."""

from __future__ import annotations

from tests.conftest import answer_all, register_user


def submit(client, headers, answers):
    return client.post("/api/assessments", json={"answers": answers}, headers=headers)


def test_catalog_is_public_and_complete(client):
    response = client.get("/api/assessments/catalog")
    assert response.status_code == 200
    catalog = response.get_json()

    assert catalog["totalPillars"] == 5
    assert catalog["totalIndicators"] == 14
    assert catalog["totalQuestions"] == 25
    assert sum(catalog["pillarWeights"].values()) == 100
    assert len(catalog["questions"]) == 25

    first = catalog["questions"][0]
    assert first["code"] == "Q01"
    assert first["pillarId"] == "p1"
    assert len(first["options"]) == 4
    assert {"index", "label", "risk", "critical"} <= set(first["options"][0])


def test_submit_risky_answers(client, auth_headers, catalog):
    response = submit(client, auth_headers, answer_all(catalog, 0))
    assert response.status_code == 201, response.get_json()
    body = response.get_json()

    assert body["overallRisk"] == 100
    assert body["criticalPenalty"] == 15
    assert body["criticalCount"] > 0
    assert body["level"]["key"] == "critical"
    assert body["comparison"]["previous"] is None
    assert body["answerCount"] == 25
    assert len(body["answers"]) == 25
    assert len(body["pillars"]) == 5
    assert sum(pillar["weight"] for pillar in body["pillars"]) == 100

    assert len(body["alerts"]) == body["criticalCount"]
    assert body["alerts"][0]["severity"] == "critical"
    assert body["alerts"][0]["id"].startswith("AL-")

    assert body["recommendations"], "a risky assessment should produce advice"
    assert body["recommendationStats"]["total"] == len(body["recommendations"])
    assert body["recommendationStats"]["done"] == 0


def test_submit_safe_answers(client, auth_headers, catalog):
    response = submit(client, auth_headers, answer_all(catalog, 3))
    assert response.status_code == 201
    body = response.get_json()

    assert body["criticalPenalty"] == 0
    assert body["criticalCount"] == 0
    assert body["alerts"] == []
    assert body["overallRisk"] < 25
    assert body["level"]["key"] == "low"
    # Even a low score keeps a short, actionable next step.
    assert 1 <= len(body["recommendations"]) <= 8


def test_accepts_list_answer_shape(client, auth_headers, catalog):
    answers = [
        {"questionId": question["code"], "optionIndex": 1}
        for question in catalog["questions"]
    ]
    response = client.post(
        "/api/assessments", json={"answers": answers}, headers=auth_headers
    )
    assert response.status_code == 201
    assert response.get_json()["answerCount"] == 25


def test_history_latest_and_comparison(client, auth_headers, catalog):
    risky = submit(client, auth_headers, answer_all(catalog, 0)).get_json()
    safe = submit(client, auth_headers, answer_all(catalog, 3)).get_json()

    latest = client.get("/api/assessments/latest", headers=auth_headers)
    assert latest.status_code == 200
    assert latest.get_json()["id"] == safe["id"]

    history = client.get("/api/assessments", headers=auth_headers)
    assert history.status_code == 200
    body = history.get_json()
    assert body["total"] == 2
    assert body["items"][0]["id"] == safe["id"]
    assert body["items"][0]["previousScore"] == risky["overallRisk"]
    assert body["items"][1]["previousScore"] is None
    assert body["items"][0]["level"]["key"] == "low"

    detail = client.get(f"/api/assessments/{risky['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.get_json()["overallRisk"] == risky["overallRisk"]

    report = client.get(f"/api/reports/{risky['id']}", headers=auth_headers)
    assert report.status_code == 200
    assert report.get_json()["id"] == risky["id"]


def test_report_csv_export(client, auth_headers, catalog):
    assessment = submit(client, auth_headers, answer_all(catalog, 0)).get_json()

    response = client.get(
        f"/api/reports/{assessment['id']}/export.csv", headers=auth_headers
    )
    assert response.status_code == 200
    assert response.headers["Content-Type"].startswith("text/csv")
    assert assessment["id"] in response.headers["Content-Disposition"]

    text = response.data.decode("utf-8-sig")
    assert "Mã đánh giá" in text
    assert assessment["id"] in text
    assert "Điểm rủi ro" in text


def test_empty_state_latest_returns_404(client, auth_headers):
    latest = client.get("/api/assessments/latest", headers=auth_headers)
    assert latest.status_code == 404
    assert latest.get_json()["error"]["code"] == "no_assessment"

    report = client.get("/api/reports/latest", headers=auth_headers)
    assert report.status_code == 404


def test_answer_validation(client, auth_headers, catalog):
    missing = client.post("/api/assessments", json={"answers": {}}, headers=auth_headers)
    assert missing.status_code == 422
    assert missing.get_json()["error"]["code"] == "invalid_answers"

    partial = answer_all(catalog, 0)
    partial.pop("Q01")
    response = submit(client, auth_headers, partial)
    assert response.status_code == 422
    assert "answers" in response.get_json()["error"]["fields"]

    unknown = answer_all(catalog, 0)
    unknown["Q99"] = 0
    assert submit(client, auth_headers, unknown).status_code == 422

    out_of_range = answer_all(catalog, 0)
    out_of_range["Q01"] = 9
    assert submit(client, auth_headers, out_of_range).status_code == 422

    no_body = client.post("/api/assessments", json={}, headers=auth_headers)
    assert no_body.status_code == 422


def test_assessments_are_private_to_the_owner(client, auth_headers, catalog):
    assessment = submit(client, auth_headers, answer_all(catalog, 0)).get_json()

    other = register_user(client, email="other@example.edu.vn")
    assert other.status_code == 201
    other_headers = {"Authorization": f"Bearer {other.get_json()['token']}"}

    assert (
        client.get(
            f"/api/assessments/{assessment['id']}", headers=other_headers
        ).status_code
        == 404
    )
    assert (
        client.get(f"/api/reports/{assessment['id']}", headers=other_headers).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/reports/{assessment['id']}/export.csv", headers=other_headers
        ).status_code
        == 404
    )
