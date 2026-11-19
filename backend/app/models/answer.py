"""Answer option model (one of four choices per question)."""

from __future__ import annotations

from app.extensions import db


class AnswerOption(db.Model):
    __tablename__ = "answer_options"
    __table_args__ = (
        db.UniqueConstraint("question_id", "display_order", name="uq_option_question_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(
        db.Integer, db.ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    label = db.Column(db.Text, nullable=False)
    risk_points = db.Column(db.Integer, nullable=False, default=0)
    critical_penalty = db.Column(db.Integer, nullable=False, default=0)
    display_order = db.Column(db.Integer, nullable=False, default=0)

    question = db.relationship("Question", back_populates="options")
    answers = db.relationship("AssessmentAnswer", back_populates="option")

    def to_dict(self) -> dict:
        return {
            "index": self.display_order,
            "label": self.label,
            "risk": self.risk_points,
            "critical": self.critical_penalty,
        }
