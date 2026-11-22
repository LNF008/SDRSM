"""Assessment creation / retrieval service shared by the API and the seeder."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.extensions import db
from app.models import (
    Assessment,
    AssessmentAnswer,
    AssessmentIndicatorScore,
    AssessmentPillarScore,
    Category,
    Indicator,
    Question,
    Recommendation,
    User,
    UserRecommendation,
)
from app.models.base import utcnow
from app.services.catalog_service import build_catalog
from app.services.recommendation_service import select_recommendations
from app.services.scoring_service import calculate_scores


def latest_assessment(user_id: int) -> Assessment | None:
    return db.session.scalars(
        db.select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
        .limit(1)
    ).first()


def generate_public_id(when: datetime) -> str:
    base = f"SDRSM-{when:%Y%m%d-%H%M}"
    candidate = base
    suffix = 1
    while db.session.scalar(
        db.select(Assessment.id).where(Assessment.public_id == candidate)
    ):
        suffix += 1
        candidate = f"{base}-{suffix}"
    return candidate


def _previous_assessment(user_id: int, when: datetime) -> Assessment | None:
    return db.session.scalars(
        db.select(Assessment)
        .where(Assessment.user_id == user_id, Assessment.created_at <= when)
        .order_by(Assessment.created_at.desc(), Assessment.id.desc())
        .limit(1)
    ).first()


def create_assessment(
    user: User,
    answers: dict[str, int],
    *,
    created_at: datetime | None = None,
    catalog: dict[str, Any] | None = None,
    commit: bool = True,
) -> Assessment:
    """Score ``answers`` and persist the full assessment graph.

    ``answers`` must already be validated as ``{question_code: option_index}``.
    """
    when = created_at or utcnow()
    catalog = catalog or build_catalog()
    result = calculate_scores(catalog, answers)

    previous = _previous_assessment(user.id, when)

    assessment = Assessment(
        public_id=generate_public_id(when),
        user_id=user.id,
        overall_risk_score=result["overallRisk"],
        weighted_risk=result["weightedRisk"],
        critical_penalty=result["criticalPenalty"],
        critical_count=result["criticalCount"],
        previous_risk=previous.overall_risk_score if previous else None,
        alerts_json=result["alerts"],
        created_at=when,
    )
    db.session.add(assessment)
    db.session.flush()

    categories = {
        category.code: category
        for category in db.session.scalars(db.select(Category)).all()
    }
    questions = {
        question.code: question
        for question in db.session.scalars(db.select(Question)).all()
    }
    indicators = {
        (indicator.category.code, indicator.slug): indicator
        for indicator in db.session.scalars(db.select(Indicator)).all()
    }

    for code, option_index in answers.items():
        question = questions.get(code)
        if question is None or not (0 <= option_index < len(question.options)):
            continue
        option = question.options[option_index]
        db.session.add(
            AssessmentAnswer(
                assessment_id=assessment.id,
                question_id=question.id,
                option_id=option.id,
                option_index=option_index,
                risk_points=option.risk_points,
                critical_penalty=option.critical_penalty,
            )
        )

    for pillar in catalog.get("pillars", []):
        category = categories.get(pillar["id"])
        if category is None:
            continue
        db.session.add(
            AssessmentPillarScore(
                assessment_id=assessment.id,
                category_id=category.id,
                score=result["pillarScores"].get(pillar["id"], 0),
            )
        )
        for indicator in pillar.get("indicators", []):
            model = indicators.get((pillar["id"], indicator["key"]))
            if model is None:
                continue
            db.session.add(
                AssessmentIndicatorScore(
                    assessment_id=assessment.id,
                    indicator_id=model.id,
                    score=result["indicatorScores"].get(pillar["id"], {}).get(
                        indicator["key"], 0
                    ),
                )
            )

    recommendations = db.session.scalars(
        db.select(Recommendation).order_by(
            Recommendation.display_order, Recommendation.id
        )
    ).all()
    selected = select_recommendations(recommendations, result["indicatorScores"])
    done_codes = {
        state.recommendation.code
        for state in (previous.recommendations if previous else [])
        if state.done and state.recommendation is not None
    }
    for recommendation, _score in selected:
        done = recommendation.code in done_codes
        db.session.add(
            UserRecommendation(
                user_id=user.id,
                assessment_id=assessment.id,
                recommendation_id=recommendation.id,
                done=done,
                done_at=utcnow() if done else None,
            )
        )

    if commit:
        db.session.commit()
    else:
        db.session.flush()

    return assessment
