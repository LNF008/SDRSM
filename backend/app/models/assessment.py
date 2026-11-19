"""Assessment, answer snapshots and pillar/indicator score models."""

from __future__ import annotations

from app.extensions import db
from app.models.base import iso_utc, utcnow


class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(40), nullable=False, unique=True, index=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    overall_risk_score = db.Column(db.Integer, nullable=False, default=0)
    weighted_risk = db.Column(db.Float, nullable=False, default=0.0)
    critical_penalty = db.Column(db.Integer, nullable=False, default=0)
    critical_count = db.Column(db.Integer, nullable=False, default=0)
    previous_risk = db.Column(db.Integer)
    alerts_json = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    user = db.relationship("User", back_populates="assessments")
    answers = db.relationship(
        "AssessmentAnswer",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentAnswer.question_id",
    )
    pillar_scores = db.relationship(
        "AssessmentPillarScore",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    indicator_scores = db.relationship(
        "AssessmentIndicatorScore",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )
    recommendations = db.relationship(
        "UserRecommendation",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="UserRecommendation.id",
    )

    @property
    def alerts(self) -> list:
        return list(self.alerts_json or [])

    def to_summary(self, previous_score: int | None = None) -> dict:
        return {
            "id": self.public_id,
            "date": iso_utc(self.created_at),
            "createdAt": iso_utc(self.created_at),
            "score": self.overall_risk_score,
            "overallRisk": self.overall_risk_score,
            "criticalCount": self.critical_count,
            "criticalPenalty": self.critical_penalty,
            "previousScore": previous_score,
        }


class AssessmentAnswer(db.Model):
    """A snapshot of one selected option; keeps reports stable over time."""

    __tablename__ = "assessment_answers"
    __table_args__ = (
        db.UniqueConstraint("assessment_id", "question_id", name="uq_answer_assessment_question"),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    question_id = db.Column(
        db.Integer, db.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    option_id = db.Column(
        db.Integer, db.ForeignKey("answer_options.id", ondelete="CASCADE"), nullable=False
    )
    option_index = db.Column(db.Integer, nullable=False, default=0)
    risk_points = db.Column(db.Integer, nullable=False, default=0)
    critical_penalty = db.Column(db.Integer, nullable=False, default=0)

    assessment = db.relationship("Assessment", back_populates="answers")
    question = db.relationship("Question")
    option = db.relationship("AnswerOption", back_populates="answers")


class AssessmentPillarScore(db.Model):
    __tablename__ = "assessment_pillar_scores"
    __table_args__ = (
        db.UniqueConstraint("assessment_id", "category_id", name="uq_pillar_score"),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    score = db.Column(db.Integer, nullable=False, default=0)

    assessment = db.relationship("Assessment", back_populates="pillar_scores")
    category = db.relationship("Category")


class AssessmentIndicatorScore(db.Model):
    __tablename__ = "assessment_indicator_scores"
    __table_args__ = (
        db.UniqueConstraint("assessment_id", "indicator_id", name="uq_indicator_score"),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(
        db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    indicator_id = db.Column(
        db.Integer, db.ForeignKey("indicators.id", ondelete="CASCADE"), nullable=False
    )
    score = db.Column(db.Integer, nullable=False, default=0)

    assessment = db.relationship("Assessment", back_populates="indicator_scores")
    indicator = db.relationship("Indicator")
