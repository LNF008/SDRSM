"""RiskScore classification.

SDRSM only ever exposes a **RiskScore** (higher = riskier). A SafeScore is never
computed or returned.
"""

from __future__ import annotations

BANDS = [
    {
        "key": "low",
        "max": 24,
        "label": "Thấp",
        "short": "Low",
        "badge": "badge--low",
        "hex": "#10b981",
        "cssVar": "--low",
        "description": "Bạn đang duy trì thói quen số an toàn. Hãy tiếp tục rà soát định kỳ.",
    },
    {
        "key": "medium",
        "max": 49,
        "label": "Trung bình",
        "short": "Medium",
        "badge": "badge--medium",
        "hex": "#f59e0b",
        "cssVar": "--medium",
        "description": "Có một số điểm yếu cần cải thiện để tránh rủi ro tích tụ.",
    },
    {
        "key": "high",
        "max": 74,
        "label": "Cao",
        "short": "High",
        "badge": "badge--high",
        "hex": "#f97316",
        "cssVar": "--high",
        "description": "Nhiều điểm yếu nghiêm trọng. Ưu tiên xử lý các cảnh báo màu đỏ.",
    },
    {
        "key": "critical",
        "max": 100,
        "label": "Nghiêm trọng",
        "short": "Critical",
        "badge": "badge--critical",
        "hex": "#e11d48",
        "cssVar": "--critical",
        "description": "Tài khoản và dữ liệu cá nhân đang gặp rủi ro cao, cần xử lý ngay.",
    },
]


def clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return min(maximum, max(minimum, value))


def classify(score) -> dict:
    """Return the risk band whose range contains ``score``."""
    try:
        value = clamp(float(score or 0))
    except (TypeError, ValueError):
        value = 0
    for band in BANDS:
        if value <= band["max"]:
            return dict(band)
    return dict(BANDS[-1])


def band_key(score) -> str:
    return classify(score)["key"]
