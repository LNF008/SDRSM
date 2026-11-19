"""RiskScore calculation.

The algorithm mirrors ``frontend/js/assessment.js`` exactly:

1. Average the selected option risk points per indicator.
2. Average indicator scores per pillar using indicator weights.
3. Combine pillar scores using pillar weights (30/25/20/15/10).
4. Add the critical penalty (each "blind spot" option), capped at 15 points.
5. Clamp the final RiskScore to 0–100.

Rounding follows JavaScript's ``Math.round`` (half up) instead of Python's
banker's rounding so the API and the client always agree.
"""

from __future__ import annotations

import math
from typing import Any

from app.services import risk_service

MAX_CRITICAL_PENALTY = 15


def js_round(value: float) -> int:
    """Round half away from zero like ``Math.round`` for non-negative values."""
    return int(math.floor(value + 0.5))


def _option_for(question: dict, option_index: int) -> dict | None:
    options = question.get("options", [])
    if 0 <= option_index < len(options):
        return options[option_index]
    return None


def calculate_scores(catalog: dict[str, Any], answers: dict[str, int]) -> dict[str, Any]:
    """Calculate pillar, indicator and overall RiskScores.

    ``catalog`` is the structure produced by
    :func:`app.services.catalog_service.build_catalog`.
    """
    pillars = catalog.get("pillars", [])
    questions = catalog.get("questions", [])

    questions_by_pillar: dict[str, list[dict]] = {}
    for question in questions:
        questions_by_pillar.setdefault(question["pillarId"], []).append(question)

    pillar_scores: dict[str, int] = {}
    indicator_scores: dict[str, dict[str, int]] = {}
    alerts: list[dict] = []
    penalty_total = 0

    for pillar in pillars:
        pillar_id = pillar["id"]
        indicator_values: dict[str, int] = {}

        for indicator in pillar.get("indicators", []):
            related = [
                question
                for question in questions_by_pillar.get(pillar_id, [])
                if question["indicator"] == indicator["key"]
            ]
            if not related:
                continue
            total = 0
            for question in related:
                option = _option_for(question, answers.get(question["code"], -1))
                total += option["risk"] if option else 0
            indicator_values[indicator["key"]] = js_round(total / len(related))

        weight_sum = sum(
            indicator["weight"]
            for indicator in pillar.get("indicators", [])
            if indicator["key"] in indicator_values
        )
        if weight_sum:
            weighted = sum(
                indicator_values[indicator["key"]] * indicator["weight"]
                for indicator in pillar.get("indicators", [])
                if indicator["key"] in indicator_values
            )
            pillar_scores[pillar_id] = js_round(weighted / weight_sum)
        else:
            pillar_scores[pillar_id] = 0

        indicator_scores[pillar_id] = indicator_values

    indicator_names = {
        (pillar["id"], indicator["key"]): indicator["name"]
        for pillar in pillars
        for indicator in pillar.get("indicators", [])
    }
    pillar_names = {pillar["id"]: pillar["name"] for pillar in pillars}
    question_meta = {question["code"]: question for question in questions}

    for code in sorted(
        (code for code in answers if code in question_meta),
        key=lambda item: question_meta[item]["order"],
    ):
        question = question_meta.get(code)
        if not question:
            continue
        option = _option_for(question, answers[code])
        if not option:
            continue
        critical = int(option.get("critical") or 0)
        if critical <= 0:
            continue
        penalty_total += critical
        alerts.append(
            {
                "id": f"AL-{code}",
                "questionId": code,
                "pillarId": question["pillarId"],
                "indicator": question["indicator"],
                "title": "Điểm mù: "
                + indicator_names.get(
                    (question["pillarId"], question["indicator"]), "Tiêu chí rủi ro"
                ),
                "description": option["label"],
                "severity": "critical",
                "impact": pillar_names.get(question["pillarId"], "Tài khoản"),
                "points": critical,
            }
        )

    weighted_risk = (
        sum(
            pillar_scores[pillar["id"]] * pillar["weight"]
            for pillar in pillars
            if pillar["id"] in pillar_scores
        )
        / 100
    )

    critical_penalty = min(MAX_CRITICAL_PENALTY, penalty_total)
    overall_risk = js_round(risk_service.clamp(weighted_risk + critical_penalty))

    return {
        "overallRisk": overall_risk,
        "weightedRisk": js_round(weighted_risk * 10) / 10,
        "criticalPenalty": critical_penalty,
        "criticalCount": len(alerts),
        "pillarScores": pillar_scores,
        "indicatorScores": indicator_scores,
        "alerts": alerts,
        "level": risk_service.classify(overall_risk),
    }


def distinct_indicator_scores(indicator_scores: dict[str, dict[str, int]]) -> list[tuple]:
    """Flatten ``{pillar: {indicator: score}}`` into sorted tuples."""
    rows = []
    for pillar_id, values in indicator_scores.items():
        for key, score in values.items():
            rows.append((pillar_id, key, score))
    return sorted(rows, key=lambda row: row[2], reverse=True)
