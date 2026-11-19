"""Unit tests for the RiskScore math and risk bands."""

from __future__ import annotations

from app.services.risk_service import classify
from app.services.scoring_service import calculate_scores


def _catalog(*, pillars=None, questions=None):
    return {"pillars": pillars or [], "questions": questions or []}


def _pillar(pid, weight=100):
    return {
        "id": pid,
        "name": f"Pillar {pid}",
        "weight": weight,
        "indicators": [{"key": "a", "name": "Indicator A", "weight": 1}],
    }


def _question(code, pid, options, order=1):
    return {
        "code": code,
        "pillarId": pid,
        "indicator": "a",
        "text": "Question",
        "order": order,
        "options": [
            {
                "index": index,
                "label": f"Option {index}",
                "risk": option["risk"],
                "critical": option.get("critical", 0),
            }
            for index, option in enumerate(options)
        ],
    }


def test_single_pillar_weighted_score_and_critical_penalty():
    catalog = _catalog(
        pillars=[_pillar("p1")],
        questions=[
            _question("Q1", "p1", [{"risk": 100, "critical": 10}, {"risk": 0}]),
            _question("Q2", "p1", [{"risk": 50}, {"risk": 0}], order=2),
        ],
    )

    result = calculate_scores(catalog, {"Q1": 0, "Q2": 0})

    assert result["indicatorScores"] == {"p1": {"a": 75}}
    assert result["pillarScores"] == {"p1": 75}
    assert result["weightedRisk"] == 75.0
    assert result["criticalPenalty"] == 10
    assert result["overallRisk"] == 85
    assert result["criticalCount"] == 1
    assert result["alerts"][0]["id"] == "AL-Q1"


def test_critical_penalty_is_capped_at_fifteen():
    catalog = _catalog(
        pillars=[_pillar("p1")],
        questions=[
            _question("Q1", "p1", [{"risk": 100, "critical": 10}]),
            _question("Q2", "p1", [{"risk": 100, "critical": 10}], order=2),
        ],
    )

    result = calculate_scores(catalog, {"Q1": 0, "Q2": 0})

    assert result["criticalPenalty"] == 15
    assert result["weightedRisk"] == 100.0
    assert result["overallRisk"] == 100
    assert result["criticalCount"] == 2


def test_pillar_weights_combine_percentages():
    catalog = _catalog(
        pillars=[_pillar("p1", 50), _pillar("p2", 50)],
        questions=[
            _question("Q1", "p1", [{"risk": 0}, {"risk": 100}]),
            _question("Q2", "p2", [{"risk": 100}, {"risk": 0}], order=2),
        ],
    )

    result = calculate_scores(catalog, {"Q1": 0, "Q2": 0})

    assert result["pillarScores"] == {"p1": 0, "p2": 100}
    assert result["weightedRisk"] == 50.0
    assert result["overallRisk"] == 50
    assert result["alerts"] == []


def test_indicator_average_uses_js_rounding():
    catalog = _catalog(
        pillars=[_pillar("p1")],
        questions=[
            _question("Q1", "p1", [{"risk": 5}]),
            _question("Q2", "p1", [{"risk": 10}], order=2),
        ],
    )

    # (5 + 10) / 2 = 7.5 -> Math.round -> 8
    result = calculate_scores(catalog, {"Q1": 0, "Q2": 0})
    assert result["indicatorScores"]["p1"]["a"] == 8


def test_missing_answers_are_treated_as_zero_risk():
    catalog = _catalog(
        pillars=[_pillar("p1")],
        questions=[_question("Q1", "p1", [{"risk": 100}, {"risk": 0}])],
    )
    result = calculate_scores(catalog, {})
    assert result["overallRisk"] == 0


def test_risk_bands_boundaries():
    assert classify(0)["key"] == "low"
    assert classify(24)["key"] == "low"
    assert classify(25)["key"] == "medium"
    assert classify(49)["key"] == "medium"
    assert classify(50)["key"] == "high"
    assert classify(74)["key"] == "high"
    assert classify(75)["key"] == "critical"
    assert classify(100)["key"] == "critical"
    assert classify("not-a-number")["key"] == "low"
