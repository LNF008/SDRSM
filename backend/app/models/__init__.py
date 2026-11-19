"""SQLAlchemy models for SDRSM.

Importing this package registers every table on the ``db`` metadata, which is
what ``db.create_all()`` and Alembic migrations rely on.
"""

from app.models.answer import AnswerOption
from app.models.assessment import (
    Assessment,
    AssessmentAnswer,
    AssessmentIndicatorScore,
    AssessmentPillarScore,
)
from app.models.category import Category
from app.models.indicator import Indicator
from app.models.question import Question
from app.models.recommendation import Recommendation, UserRecommendation
from app.models.user import User

__all__ = [
    "AnswerOption",
    "Assessment",
    "AssessmentAnswer",
    "AssessmentIndicatorScore",
    "AssessmentPillarScore",
    "Category",
    "Indicator",
    "Question",
    "Recommendation",
    "User",
    "UserRecommendation",
]
