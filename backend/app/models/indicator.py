"""Indicator (sub-criteria) model that belongs to a category."""

from __future__ import annotations

from app.extensions import db


class Indicator(db.Model):
    __tablename__ = "indicators"
    __table_args__ = (
        db.UniqueConstraint("category_id", "slug", name="uq_indicator_category_slug"),
    )

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    slug = db.Column(db.String(40), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    weight = db.Column(db.Integer, nullable=False, default=0)
    display_order = db.Column(db.Integer, nullable=False, default=0)

    category = db.relationship("Category", back_populates="indicators")
    questions = db.relationship("Question", back_populates="indicator")
    scores = db.relationship("AssessmentIndicatorScore", back_populates="indicator")

    def to_dict(self) -> dict:
        return {
            "key": self.slug,
            "name": self.name,
            "weight": self.weight,
        }
