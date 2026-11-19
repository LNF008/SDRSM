"""Assessment question model."""

from __future__ import annotations

from app.extensions import db


class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False, unique=True, index=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    indicator_id = db.Column(
        db.Integer, db.ForeignKey("indicators.id", ondelete="CASCADE"), nullable=False
    )
    text = db.Column(db.Text, nullable=False)
    display_order = db.Column(db.Integer, nullable=False, default=0)

    category = db.relationship("Category", back_populates="questions")
    indicator = db.relationship("Indicator", back_populates="questions")
    options = db.relationship(
        "AnswerOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="AnswerOption.display_order",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.code,
            "code": self.code,
            "pillarId": self.category.code,
            "indicator": self.indicator.slug,
            "text": self.text,
            "order": self.display_order,
            "options": [option.to_dict() for option in self.options],
        }
