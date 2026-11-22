"""Recommendation selection based on the weakest indicators."""

from __future__ import annotations

from typing import Any, Iterable

PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
DEFAULT_MINIMUM_SCORE = 50
DEFAULT_LIMIT = 8


def _score_for(indicator_scores: dict[str, dict[str, int]], recommendation) -> int | None:
    pillar_id = recommendation.category.code if recommendation.category else None
    if not pillar_id or not recommendation.indicator_key:
        return None
    return indicator_scores.get(pillar_id, {}).get(recommendation.indicator_key)


def select_recommendations(
    recommendations: Iterable,
    indicator_scores: dict[str, dict[str, int]],
    *,
    minimum_score: int = DEFAULT_MINIMUM_SCORE,
    limit: int = DEFAULT_LIMIT,
) -> list[tuple[Any, int]]:
    """Pick recommendations for indicators that need attention.

    A recommendation is selected when its linked indicator scores at least
    ``minimum_score`` (or at least 30 for ``critical`` priority items, so urgent
    advice is never hidden by a single good answer). When nothing crosses the
    threshold the three weakest indicators are used instead, guaranteeing that
    a report always offers a next step.
    """
    scored: list[tuple[Any, int]] = []
    for recommendation in recommendations:
        score = _score_for(indicator_scores, recommendation)
        if score is None:
            continue
        threshold = 30 if recommendation.priority == "critical" else minimum_score
        if score >= threshold:
            scored.append((recommendation, score))

    if not scored:
        fallback: list[tuple[Any, int]] = []
        for recommendation in recommendations:
            score = _score_for(indicator_scores, recommendation)
            if score is not None:
                fallback.append((recommendation, score))
        fallback.sort(key=lambda item: item[1], reverse=True)
        scored = fallback[:3]

    scored.sort(
        key=lambda item: (
            PRIORITY_RANK.get(item[0].priority, 9),
            -item[1],
            item[0].display_order,
        )
    )

    seen: set[str] = set()
    result: list[tuple[Any, int]] = []
    for recommendation, score in scored:
        if recommendation.code in seen:
            continue
        seen.add(recommendation.code)
        result.append((recommendation, score))
        if len(result) >= limit:
            break
    return result
