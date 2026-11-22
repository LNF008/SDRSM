"""JSON serialisation helpers: the API contract consumed by the frontend."""

from __future__ import annotations

import csv
import io
from typing import Any

from app.extensions import db
from app.models.assessment import Assessment
from app.models.base import iso_utc
from app.services import risk_service
from app.services.catalog_service import build_catalog


def user_stats(user) -> dict[str, Any]:
    rows = db.session.scalars(
        db.select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
    ).all()
    latest = rows[0] if rows else None
    return {
        "assessmentCount": len(rows),
        "lastAssessmentAt": iso_utc(latest.created_at) if latest else None,
        "lastAssessmentId": latest.public_id if latest else None,
        "overallRisk": latest.overall_risk_score if latest else None,
    }


def serialize_user(user, *, stats: dict | None = None) -> dict[str, Any]:
    return user.to_dict(stats or user_stats(user))


def comparison_payload(assessment: Assessment) -> dict[str, Any]:
    previous = assessment.previous_risk
    current = assessment.overall_risk_score
    if previous is None:
        return {"previous": None, "delta": 0, "direction": "flat", "improved": False}
    delta = current - previous
    return {
        "previous": previous,
        "delta": delta,
        "direction": "down" if delta < 0 else "up" if delta > 0 else "flat",
        "improved": delta < 0,
    }


def assessment_summary(
    assessment: Assessment, previous_score: int | None = None
) -> dict[str, Any]:
    data = assessment.to_summary(previous_score)
    data["level"] = risk_service.classify(assessment.overall_risk_score)
    data["delta"] = (
        assessment.overall_risk_score - previous_score
        if previous_score is not None
        else None
    )
    return data


def _pillar_lookup(catalog: dict[str, Any]) -> dict[str, dict]:
    return {pillar["id"]: pillar for pillar in catalog.get("pillars", [])}


def assessment_detail(
    assessment: Assessment,
    *,
    catalog: dict[str, Any] | None = None,
    include_answers: bool = True,
) -> dict[str, Any]:
    """Full report payload for one assessment."""
    catalog = catalog or build_catalog()
    pillars = _pillar_lookup(catalog)

    stored_pillars = {
        row.category.code: row.score
        for row in assessment.pillar_scores
        if row.category is not None
    }
    stored_indicators = {
        (row.indicator.category.code, row.indicator.slug): row.score
        for row in assessment.indicator_scores
        if row.indicator is not None and row.indicator.category is not None
    }

    pillar_payload = []
    for pillar in catalog.get("pillars", []):
        pillar_id = pillar["id"]
        indicators = []
        for indicator in pillar.get("indicators", []):
            indicators.append(
                {
                    "key": indicator["key"],
                    "name": indicator["name"],
                    "weight": indicator["weight"],
                    "score": stored_indicators.get(
                        (pillar_id, indicator["key"]), 0
                    ),
                }
            )
        item = dict(pillar)
        item["score"] = stored_pillars.get(pillar_id, 0)
        item["indicators"] = indicators
        pillar_payload.append(item)

    data: dict[str, Any] = {
        "id": assessment.public_id,
        "createdAt": iso_utc(assessment.created_at),
        "date": iso_utc(assessment.created_at),
        "score": assessment.overall_risk_score,
        "overallRisk": assessment.overall_risk_score,
        "weightedRisk": round(assessment.weighted_risk, 1),
        "criticalPenalty": assessment.critical_penalty,
        "criticalCount": assessment.critical_count,
        "previousRisk": assessment.previous_risk,
        "level": risk_service.classify(assessment.overall_risk_score),
        "pillars": pillar_payload,
        "alerts": assessment.alerts,
        "comparison": comparison_payload(assessment),
        "recommendations": [row.to_dict() for row in assessment.recommendations],
        "recommendationStats": recommendation_stats(assessment.recommendations),
    }

    if include_answers:
        ordered = sorted(
            assessment.answers,
            key=lambda row: (
                row.question.display_order if row.question else 0,
                row.question_id,
            ),
        )
        data["answers"] = {
            row.question.code: row.option_index for row in ordered if row.question
        }
        data["answerCount"] = len(ordered)
        data["answerDetails"] = [
            {
                "questionId": row.question.code,
                "question": row.question.text,
                "pillarId": row.question.category.code,
                "indicator": row.question.indicator.slug,
                "indicatorName": row.question.indicator.name,
                "optionIndex": row.option_index,
                "label": row.option.label if row.option else None,
                "risk": row.risk_points,
                "critical": row.critical_penalty,
            }
            for row in ordered
            if row.question is not None
        ]

    return data


def recommendation_stats(rows) -> dict[str, int]:
    items = list(rows or [])
    done = sum(1 for item in items if item.done)
    critical_open = sum(
        1
        for item in items
        if not item.done and item.recommendation and item.recommendation.priority == "critical"
    )
    return {
        "total": len(items),
        "done": done,
        "open": len(items) - done,
        "criticalOpen": critical_open,
    }


def assessment_csv(assessment: Assessment, catalog: dict[str, Any] | None = None) -> str:
    """Tabular CSV export (one row per indicator) with a UTF-8 BOM for Excel."""
    detail = assessment_detail(assessment, catalog=catalog, include_answers=False)
    alerts_by_indicator: dict[tuple[str, str], list[str]] = {}
    for alert in detail["alerts"]:
        key = (alert.get("pillarId"), alert.get("indicator"))
        alerts_by_indicator.setdefault(key, []).append(alert.get("title", ""))

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Mã đánh giá",
            "Ngày đánh giá",
            "Điểm rủi ro",
            "Mức rủi ro",
            "Điểm phạt nghiêm trọng",
            "Trụ cột",
            "Trọng số trụ cột (%)",
            "Điểm trụ cột",
            "Tiêu chí",
            "Trọng số tiêu chí (%)",
            "Điểm tiêu chí",
            "Cảnh báo nghiêm trọng",
        ]
    )
    for pillar in detail["pillars"]:
        for indicator in pillar["indicators"]:
            alerts = alerts_by_indicator.get((pillar["id"], indicator["key"]), [])
            writer.writerow(
                [
                    detail["id"],
                    detail["createdAt"],
                    detail["overallRisk"],
                    detail["level"]["label"],
                    detail["criticalPenalty"],
                    pillar["name"],
                    pillar["weight"],
                    pillar["score"],
                    indicator["name"],
                    indicator["weight"],
                    indicator["score"],
                    " | ".join(alerts),
                ]
            )
    return "\ufeff" + buffer.getvalue()
