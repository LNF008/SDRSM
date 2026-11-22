"""Idempotent database seeding.

Run with ``flask --app run.py seed``. The catalog is upserted by code, so the
command can be executed repeatedly without duplicating rows or breaking existing
assessments.
"""

from __future__ import annotations

from app.extensions import db
from app.models import (
    AnswerOption,
    Category,
    Indicator,
    Question,
    Recommendation,
)
from app.models.base import utcnow
from app.seed_data import PILLARS, QUESTIONS, RECOMMENDATIONS


def seed_catalog() -> dict[str, int]:
    categories: dict[str, Category] = {}
    for pillar in PILLARS:
        category = db.session.scalar(
            db.select(Category).where(Category.code == pillar["code"])
        )
        if category is None:
            category = Category(code=pillar["code"])
            db.session.add(category)
        category.name = pillar["name"]
        category.short_name = pillar["shortName"]
        category.english_name = pillar["english"]
        category.weight = pillar["weight"]
        category.display_order = pillar["order"]
        category.icon = pillar["icon"]
        category.color = pillar["color"]
        category.soft = pillar["soft"]
        category.intro = pillar["intro"]
        category.description = pillar["description"]
        db.session.flush()

        for order, definition in enumerate(pillar["indicators"], start=1):
            indicator = db.session.scalar(
                db.select(Indicator).where(
                    Indicator.category_id == category.id,
                    Indicator.slug == definition["key"],
                )
            )
            if indicator is None:
                indicator = Indicator(category_id=category.id, slug=definition["key"])
                db.session.add(indicator)
            indicator.name = definition["name"]
            indicator.weight = definition["weight"]
            indicator.display_order = order

        categories[pillar["code"]] = category

    db.session.flush()

    indicator_map = {
        (indicator.category.code, indicator.slug): indicator
        for indicator in db.session.scalars(db.select(Indicator)).all()
    }

    for order, definition in enumerate(QUESTIONS, start=1):
        category = categories[definition["pillar"]]
        indicator = indicator_map[(definition["pillar"], definition["indicator"])]
        question = db.session.scalar(
            db.select(Question).where(Question.code == definition["code"])
        )
        if question is None:
            question = Question(code=definition["code"])
            db.session.add(question)
        question.category_id = category.id
        question.indicator_id = indicator.id
        question.text = definition["text"]
        question.display_order = order
        db.session.flush()

        existing = {option.display_order: option for option in question.options}
        for index, option_definition in enumerate(definition["options"]):
            option = existing.get(index)
            if option is None:
                option = AnswerOption(question_id=question.id, display_order=index)
                db.session.add(option)
                existing[index] = option
            option.label = option_definition["label"]
            option.risk_points = option_definition["risk"]
            option.critical_penalty = option_definition.get("critical", 0)

    for order, definition in enumerate(RECOMMENDATIONS, start=1):
        category = categories[definition["pillar"]]
        recommendation = db.session.scalar(
            db.select(Recommendation).where(Recommendation.code == definition["code"])
        )
        if recommendation is None:
            recommendation = Recommendation(code=definition["code"])
            db.session.add(recommendation)
        recommendation.category_id = category.id
        recommendation.indicator_key = definition["indicator"]
        recommendation.priority = definition["priority"]
        recommendation.title = definition["title"]
        recommendation.description = definition["description"]
        recommendation.action = definition["action"]
        recommendation.icon = definition["icon"]
        recommendation.display_order = order

    db.session.commit()

    return {
        "pillars": len(PILLARS),
        "indicators": sum(len(pillar["indicators"]) for pillar in PILLARS),
        "questions": len(QUESTIONS),
        "options": sum(len(question["options"]) for question in QUESTIONS),
        "recommendations": len(RECOMMENDATIONS),
    }


def seed_all() -> dict[str, int]:
    return seed_catalog()
