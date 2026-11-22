"""Assessment catalog, submission and history endpoints."""

from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models.assessment import Assessment
from app.serializers import assessment_detail, assessment_summary
from app.services.assessment_service import create_assessment, latest_assessment
from app.services.catalog_service import build_catalog, public_catalog
from app.utils.auth import jwt_required
from app.utils.responses import error_response
from app.utils.validators import (
    ValidationError,
    get_json_object,
    parse_pagination,
    validate_answers,
)

assessments_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")


@assessments_bp.get("/catalog")
def catalog():
    """Public question bank used to render the assessment form."""
    return jsonify(public_catalog())


@assessments_bp.post("")
@jwt_required
def submit_assessment():
    payload = get_json_object()
    catalog_data = build_catalog()

    if not catalog_data["questions"]:
        return error_response(
            "Ngân hàng câu hỏi chưa được khởi tạo. Hãy chạy: flask --app run.py seed",
            503,
            code="catalog_empty",
        )

    answers = validate_answers(payload, catalog_data)
    assessment = create_assessment(
        g.current_user, answers, catalog=catalog_data, commit=True
    )
    return jsonify(assessment_detail(assessment, catalog=catalog_data)), 201


@assessments_bp.get("")
@jwt_required
def list_assessments():
    page, per_page = parse_pagination(request.args)
    user = g.current_user

    rows = db.session.scalars(
        db.select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
    ).all()

    start = (page - 1) * per_page
    page_rows = rows[start : start + per_page]
    items = []
    for offset, row in enumerate(page_rows):
        index = start + offset
        previous_score = (
            rows[index + 1].overall_risk_score if index + 1 < len(rows) else None
        )
        items.append(assessment_summary(row, previous_score))

    return jsonify(
        {
            "items": items,
            "page": page,
            "perPage": per_page,
            "total": len(rows),
            "totalPages": (len(rows) + per_page - 1) // per_page if rows else 0,
        }
    )


@assessments_bp.get("/latest")
@jwt_required
def get_latest():
    assessment = latest_assessment(g.current_user.id)
    if assessment is None:
        return error_response(
            "Bạn chưa hoàn thành bài đánh giá nào.",
            404,
            code="no_assessment",
        )
    return jsonify(assessment_detail(assessment))


def get_owned_assessment(public_id: str) -> Assessment:
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


@assessments_bp.get("/<public_id>")
@jwt_required
def get_assessment(public_id: str):
    return jsonify(assessment_detail(get_owned_assessment(public_id)))
