"""Assessment category (pillar) model."""

from __future__ import annotations

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), nullable=False, unique=True, index=True)
    name = db.Column(db.String(160), nullable=False)
    short_name = db.Column(db.String(60), nullable=False)
    english_name = db.Column(db.String(160))
    weight = db.Column(db.Integer, nullable=False, default=0)
    display_order = db.Column(db.Integer, nullable=False, default=0)
    icon = db.Column(db.String(60))
    color = db.Column(db.String(16))
    soft = db.Column(db.String(64))
    intro = db.Column(db.Text)
    description = db.Column(db.Text)

    indicators = db.relationship(
        "Indicator",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Indicator.display_order",
    )
    questions = db.relationship(
        "Question",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Question.display_order",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.code,
            "code": self.code,
            "name": self.name,
            "shortName": self.short_name,
            "english": self.english_name or "",
            "weight": self.weight,
            "order": self.display_order,
            "icon": self.icon or "",
            "color": self.color or "#6366f1",
            "soft": self.soft or "rgba(99, 102, 241, 0.13)",
            "intro": self.intro or "",
            "description": self.description or self.intro or "",
            "indicators": [indicator.to_dict() for indicator in self.indicators],
        }
