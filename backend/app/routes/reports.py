"""Report endpoints (JSON + CSV export)."""

from __future__ import annotations

from flask import Blueprint, Response, g, jsonify

from app.serializers import assessment_csv, assessment_detail
from app.services.assessment_service import latest_assessment
from app.utils.auth import jwt_required
from app.utils.responses import error_response
from app.routes.assessments import get_owned_assessment

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.get("/<public_id>")
@jwt_required
def get_report(public_id: str):
    assessment = get_owned_assessment(public_id)
    return jsonify(assessment_detail(assessment))


@reports_bp.get("/latest")
@jwt_required
def get_latest_report():
    assessment = latest_assessment(g.current_user.id)
    if assessment is None:
        return error_response(
            "Bạn chưa hoàn thành bài đánh giá nào.",
            404,
            code="no_assessment",
        )
    return jsonify(assessment_detail(assessment))


@reports_bp.get("/<public_id>/export.csv")
@jwt_required
def export_report_csv(public_id: str):
    assessment = get_owned_assessment(public_id)
    csv_text = assessment_csv(assessment)
    filename = f"{assessment.public_id}.csv"
    return Response(
        csv_text,
        content_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
