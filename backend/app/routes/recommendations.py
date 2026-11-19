"""Recommendation endpoints."""

from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models.assessment import Assessment
from app.models.base import utcnow
from app.models.recommendation import PRIORITY_LABELS, UserRecommendation
from app.serializers import recommendation_stats
from app.services.assessment_service import latest_assessment
from app.services.catalog_service import build_catalog
from app.utils.auth import jwt_required
from app.utils.responses import error_response
from app.utils.validators import (
    ValidationError,
    get_json_object,
    parse_bool,
    parse_priority_list,
)

recommendations_bp = Blueprint(
    "recommendations", __name__, url_prefix="/api/recommendations"
)


def _resolve_assessment() -> Assessment | None:
    public_id = (request.args.get("assessmentId") or "").strip()
    if not public_id:
        return latest_assessment(g.current_user.id)

    assessment = db.session.scalar(
        db.select(Assessment).where(
            Assessment.public_id == public_id,
            Assessment.user_id == g.current_user.id,
        )
    )
    if assessment is None:
        raise ValidationError(
            "Không tìm thấy bài đánh giá.",
            status=404,
            code="assessment_not_found",
        )
    return assessment


def _serialize_rows(rows) -> list[dict]:
    pillars = {
        pillar["id"]: pillar for pillar in build_catalog().get("pillars", [])
    }
    items = []
    for row in rows:
        item = row.to_dict()
        item["pillar"] = pillars.get(item.get("pillarId"))
        items.append(item)
    return items


@recommendations_bp.get("")
@jwt_required
def list_recommendations():
    assessment = _resolve_assessment()
    if assessment is None:
        return jsonify(
            {
                "items": [],
                "stats": {"total": 0, "done": 0, "open": 0, "criticalOpen": 0},
                "assessmentId": None,
                "total": 0,
            }
        )

    rows = list(assessment.recommendations)
    stats = recommendation_stats(rows)
    items = _serialize_rows(rows)

    priority_filter = [
        value.strip()
        for value in (request.args.get("priority") or "").split(",")
        if value.strip()
    ]
    if priority_filter:
        priorities = parse_priority_list(priority_filter, PRIORITY_LABELS)
        items = [item for item in items if item["priority"] in priorities]

    pillar_filter = (request.args.get("pillarId") or "").strip()
    if pillar_filter:
        items = [item for item in items if item["pillarId"] == pillar_filter]

    status = (request.args.get("status") or "all").strip().lower()
    if status == "open":
        items = [item for item in items if not item["done"]]
    elif status == "done":
        items = [item for item in items if item["done"]]
    elif status != "all":
        raise ValidationError(
            "status phải là một trong: all, open, done.", {"status": "Không hợp lệ."}
        )

    return jsonify(
        {
            "items": items,
            "stats": stats,
            "assessmentId": assessment.public_id,
            "total": len(items),
        }
    )


@recommendations_bp.patch("/<int:item_id>")
@jwt_required
def update_recommendation(item_id: int):
    state = db.session.get(UserRecommendation, item_id)
    if state is None or state.user_id != g.current_user.id:
        return error_response(
            "Không tìm thấy khuyến nghị.", 404, code="recommendation_not_found"
        )

    payload = get_json_object()
    if "done" not in payload:
        raise ValidationError("Thiếu trường done.", {"done": "Bắt buộc"}, status=400)
    done = parse_bool(payload.get("done"), field="done")

    state.done = done
    state.done_at = utcnow() if done else None
    db.session.commit()

    stats = recommendation_stats(state.assessment.recommendations)
    item = _serialize_rows([state])[0]
    return jsonify({"item": item, "stats": stats})
