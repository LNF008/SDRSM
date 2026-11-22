"""Recommendation catalog and per-user completion state."""

from __future__ import annotations

from app.extensions import db
from app.models.base import iso_utc, utcnow

PRIORITY_LABELS = {
    "critical": "Nghiêm trọng",
    "high": "Cao",
    "medium": "Trung bình",
    "low": "Thấp",
}

TIME_TO_FIX = {
    "critical": "~10 phút",
    "high": "~15 phút",
    "medium": "~20 phút",
    "low": "~5 phút",
}


class Recommendation(db.Model):
    __tablename__ = "recommendations"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False, unique=True, index=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    indicator_key = db.Column(db.String(40))
    priority = db.Column(db.String(20), nullable=False, default="medium")
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    action = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(60))
    display_order = db.Column(db.Integer, nullable=False, default=0)

    category = db.relationship("Category")
    states = db.relationship("UserRecommendation", back_populates="recommendation")

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "pillarId": self.category.code if self.category else None,
            "indicatorKey": self.indicator_key,
            "priority": self.priority,
            "priorityLabel": PRIORITY_LABELS.get(self.priority, "Trung bình"),
            "title": self.title,
            "description": self.description,
            "action": self.action,
            "icon": self.icon or "bi-check-circle",
            "timeToFix": TIME_TO_FIX.get(self.priority, "~15 phút"),
        }


class UserRecommendation(db.Model):
    __tablename__ = "user_recommendations"
    __table_args__ = (
        db.UniqueConstraint(
            "assessment_id", "recommendation_id", name="uq_user_recommendation"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    recommendation_id = db.Column(
        db.Integer, db.ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False
    )
    done = db.Column(db.Boolean, nullable=False, default=False)
    done_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="recommendation_states")
    assessment = db.relationship("Assessment", back_populates="recommendations")
    recommendation = db.relationship("Recommendation", back_populates="states")

    def to_dict(self) -> dict:
        data = self.recommendation.to_dict()
        data.update(
            {
                "id": self.id,
                "assessmentId": self.assessment.public_id if self.assessment else None,
                "done": bool(self.done),
                "doneAt": iso_utc(self.done_at),
            }
        )
        return data
