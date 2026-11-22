"""Build the assessment catalog (pillars + questions) from the database."""

from __future__ import annotations

from typing import Any

from app.extensions import db
from app.models.category import Category
from app.models.question import Question


def build_catalog() -> dict[str, Any]:
    """Return pillars/questions in the same shape as ``frontend/js/questions.js``."""
    categories = db.session.scalars(
        db.select(Category).order_by(Category.display_order, Category.id)
    ).all()
    questions = db.session.scalars(
        db.select(Question).order_by(Question.display_order, Question.id)
    ).all()

    pillars = [category.to_dict() for category in categories]
    question_payloads = [question.to_dict() for question in questions]

    return {
        "pillars": pillars,
        "questions": question_payloads,
        "pillarIndex": {pillar["id"]: pillar for pillar in pillars},
        "questionIndex": {question["code"]: question for question in question_payloads},
    }


def public_catalog(catalog: dict[str, Any] | None = None) -> dict[str, Any]:
    """Catalog response used by ``GET /api/assessments/catalog``."""
    catalog = catalog or build_catalog()
    return {
        "version": 1,
        "pillars": catalog["pillars"],
        "questions": catalog["questions"],
        "totalPillars": len(catalog["pillars"]),
        "totalQuestions": len(catalog["questions"]),
        "totalIndicators": sum(
            len(pillar.get("indicators", [])) for pillar in catalog["pillars"]
        ),
        "pillarWeights": {
            pillar["id"]: pillar["weight"] for pillar in catalog["pillars"]
        },
    }
