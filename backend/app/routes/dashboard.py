"""Dashboard aggregation endpoint."""

from __future__ import annotations

from flask import Blueprint, g, jsonify

from app.extensions import db
from app.models.assessment import Assessment
from app.models.base import iso_utc, utcnow
from app.serializers import (
    assessment_detail,
    assessment_summary,
    recommendation_stats,
    serialize_user,
    user_stats,
)
from app.services.assessment_service import latest_assessment
from app.services.catalog_service import build_catalog
from app.utils.auth import jwt_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

EMPTY_STATS = {"total": 0, "done": 0, "open": 0, "criticalOpen": 0}
EMPTY_COMPARISON = {"previous": None, "delta": 0, "direction": "flat", "improved": False}


def _notifications(assessment: Assessment, detail: dict) -> list[dict]:
    items: list[dict] = []
    created = iso_utc(assessment.created_at)

    if assessment.critical_count:
        first = detail["alerts"][0] if detail.get("alerts") else None
        items.append(
            {
                "id": "N-01",
                "icon": "bi-exclamation-octagon-fill",
                "tone": "critical",
                "title": f"{assessment.critical_count} cảnh báo nghiêm trọng",
                "body": first["title"] if first else "Có điểm mù nghiêm trọng cần xử lý.",
                "time": created,
                "unread": True,
            }
        )

    delta = detail["comparison"]["delta"]
    if assessment.previous_risk is not None and delta != 0:
        improved = delta < 0
        items.append(
            {
                "id": "N-02",
                "icon": "bi-graph-down-arrow" if improved else "bi-graph-up-arrow",
                "tone": "low" if improved else "high",
                "title": f"Điểm rủi ro {'giảm' if improved else 'tăng'} {abs(delta)} điểm",
                "body": f"So với lần đánh giá trước ({assessment.previous_risk}/100).",
                "time": created,
                "unread": True,
            }
        )

    items.append(
        {
            "id": "N-03",
            "icon": "bi-calendar-check",
            "tone": "info",
            "title": "Đã đến lúc đánh giá lại",
            "body": "Bạn nên rà soát lại rủi ro mỗi 4–6 tuần.",
            "time": iso_utc(utcnow()),
            "unread": False,
        }
    )
    return items


def _activity(history: list[dict], recommendation_rows) -> list[dict]:
    items = [
        {
            "icon": "bi-clipboard-check",
            "text": f"Hoàn thành đánh giá {row['id']}",
            "time": row["date"],
        }
        for row in history[:4]
    ]
    for row in recommendation_rows:
        if row.done and row.done_at:
            items.append(
                {
                    "icon": "bi-check2-circle",
                    "text": f"Đánh dấu hoàn thành “{row.recommendation.title}”",
                    "time": iso_utc(row.done_at),
                }
            )
    items.sort(key=lambda item: item["time"] or "", reverse=True)
    return items[:6]


@dashboard_bp.get("")
@jwt_required
def dashboard():
    user = g.current_user
    stats = user_stats(user)
    payload = {
        "user": serialize_user(user, stats=stats),
        "hasAssessment": False,
        "latest": None,
        "comparison": dict(EMPTY_COMPARISON),
        "history": [],
        "trend": [],
        "recommendations": {
            "items": [],
            "stats": dict(EMPTY_STATS),
            "assessmentId": None,
        },
        "notifications": [],
        "activity": [],
    }

    assessment = latest_assessment(user.id)
    if assessment is None:
        return jsonify(payload)

    catalog = build_catalog()
    detail = assessment_detail(assessment, catalog=catalog, include_answers=False)
    pillar_map = {pillar["id"]: pillar for pillar in catalog.get("pillars", [])}

    rows = db.session.scalars(
        db.select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
    ).all()
    history = []
    for index, row in enumerate(rows):
        previous_score = rows[index + 1].overall_risk_score if index + 1 < len(rows) else None
        history.append(assessment_summary(row, previous_score))

    recommendation_rows = list(assessment.recommendations)
    recommendation_items = []
    for row in recommendation_rows:
        item = row.to_dict()
        item["pillar"] = pillar_map.get(item.get("pillarId"))
        recommendation_items.append(item)

    payload.update(
        {
            "hasAssessment": True,
            "latest": detail,
            "comparison": detail["comparison"],
            "history": history,
            "trend": [
                {
                    "id": item["id"],
                    "date": item["date"],
                    "score": item["score"],
                    "criticalCount": item["criticalCount"],
                    "level": item["level"],
                }
                for item in reversed(history[:8])
            ],
            "recommendations": {
                "items": recommendation_items,
                "stats": recommendation_stats(recommendation_rows),
                "assessmentId": assessment.public_id,
            },
            "notifications": _notifications(assessment, detail),
            "activity": _activity(history, recommendation_rows),
        }
    )
    return jsonify(payload)
