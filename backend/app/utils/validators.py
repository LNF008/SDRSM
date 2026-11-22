"""Input validation helpers.

Every validator raises :class:`ValidationError`; the application factory turns
that exception into a ``422`` (or ``409``) JSON response.
"""

from __future__ import annotations

import re
from typing import Any, Iterable

from flask import request

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
PASSWORD_LETTER_RE = re.compile(r"[A-Za-z]")
PASSWORD_DIGIT_RE = re.compile(r"\d")
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


class ValidationError(Exception):
    """Raised when a request payload cannot be accepted."""

    def __init__(
        self,
        message: str,
        fields: dict[str, str] | None = None,
        status: int = 422,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.fields = fields or {}
        self.status = status
        self.code = code


def get_json_object() -> dict[str, Any]:
    """Return the JSON body, refusing anything that is not an object."""
    if not request.is_json:
        raise ValidationError(
            "Nội dung yêu cầu phải là JSON (Content-Type: application/json).",
            status=400,
            code="invalid_content_type",
        )
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValidationError("Dữ liệu JSON phải là một đối tượng.", status=400)
    return payload


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValidationError("Giá trị phải là chuỗi ký tự.")
    return CONTROL_CHARS_RE.sub("", value).strip()


def require_text(
    payload: dict[str, Any],
    key: str,
    *,
    label: str | None = None,
    min_length: int = 1,
    max_length: int = 255,
    required: bool = True,
) -> str | None:
    """Read, trim and length-check a string field."""
    label = label or key
    raw = payload.get(key)
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        if required:
            raise ValidationError(f"Thiếu thông tin bắt buộc: {label}.", {key: "Bắt buộc"})
        return None

    value = clean_text(raw)
    if len(value) < min_length:
        raise ValidationError(
            f"{label} phải có ít nhất {min_length} ký tự.", {key: "Quá ngắn"}
        )
    if len(value) > max_length:
        raise ValidationError(
            f"{label} không được vượt quá {max_length} ký tự.", {key: "Quá dài"}
        )
    return value


def validate_email(value: Any) -> str:
    email = clean_text(value).lower()
    if not email:
        raise ValidationError("Thiếu email.", {"email": "Bắt buộc"})
    if len(email) > 190 or not EMAIL_RE.match(email):
        raise ValidationError(
            "Email không hợp lệ.", {"email": "Địa chỉ email không đúng định dạng."}
        )
    return email


def validate_password(value: Any, *, field: str = "password") -> str:
    if not isinstance(value, str) or not value:
        raise ValidationError("Thiếu mật khẩu.", {field: "Bắt buộc"})
    if len(value) < 8:
        raise ValidationError(
            "Mật khẩu phải có ít nhất 8 ký tự.", {field: "Tối thiểu 8 ký tự."}
        )
    if len(value) > 128:
        raise ValidationError(
            "Mật khẩu không được vượt quá 128 ký tự.", {field: "Tối đa 128 ký tự."}
        )
    if not PASSWORD_LETTER_RE.search(value) or not PASSWORD_DIGIT_RE.search(value):
        raise ValidationError(
            "Mật khẩu phải bao gồm cả chữ và số.",
            {field: "Cần ít nhất một chữ cái và một chữ số."},
        )
    return value


def parse_bool(value: Any, *, field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "on"}:
            return True
        if lowered in {"false", "0", "no", "off"}:
            return False
    raise ValidationError(
        f"Giá trị của {field} phải là true hoặc false.",
        {field: "Giá trị không hợp lệ."},
    )


def parse_pagination(args, *, default_per_page: int = 20, max_per_page: int = 100):
    """Parse ``?page=&perPage=`` query parameters."""

    def _int(name: str, default: int) -> int:
        raw = args.get(name)
        if raw is None or raw == "":
            return default
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise ValidationError(
                f"Tham số {name} phải là số nguyên.", {name: "Số nguyên không hợp lệ."}
            )
        return value

    page = _int("page", 1)
    per_page = _int("perPage", default_per_page)
    if page < 1:
        raise ValidationError("page phải lớn hơn hoặc bằng 1.", {"page": "Tối thiểu 1."})
    if per_page < 1 or per_page > max_per_page:
        raise ValidationError(
            f"perPage phải nằm trong khoảng 1–{max_per_page}.",
            {"perPage": f"1–{max_per_page}"},
        )
    return page, per_page


def _extract_answer_items(raw_answers: Any) -> list[tuple[str, Any]]:
    """Normalise the two accepted answer shapes into ``(question_code, value)``."""
    if isinstance(raw_answers, dict):
        return [(str(code).strip(), value) for code, value in raw_answers.items()]

    if isinstance(raw_answers, list):
        items: list[tuple[str, Any]] = []
        for index, entry in enumerate(raw_answers):
            if not isinstance(entry, dict):
                raise ValidationError(
                    f"Phần tử answers[{index}] phải là một đối tượng.",
                    {"answers": "Danh sách câu trả lời không hợp lệ."},
                )
            code = entry.get("questionId") or entry.get("code") or entry.get("id")
            value = entry.get("optionIndex", entry.get("option", entry.get("answer")))
            if code is None:
                raise ValidationError(
                    f"Phần tử answers[{index}] thiếu questionId.",
                    {"answers": "Mỗi câu trả lời cần questionId."},
                )
            items.append((str(code).strip(), value))
        return items

    raise ValidationError(
        "Trường answers phải là một đối tượng hoặc danh sách câu trả lời.",
        {"answers": "Định dạng không hợp lệ."},
    )


def validate_answers(payload: dict[str, Any], catalog: dict[str, Any]) -> dict[str, int]:
    """Validate a full answer set against the question catalog.

    The returned mapping is ``{question_code: option_index}`` and is guaranteed
    to contain exactly one answer for every question.
    """
    raw_answers = payload.get("answers")
    if raw_answers is None:
        raise ValidationError(
            "Thiếu danh sách câu trả lời (answers).", {"answers": "Bắt buộc"}
        )

    questions = catalog.get("questions", [])
    expected = {question["code"]: question for question in questions}
    received = _extract_answer_items(raw_answers)

    errors: dict[str, str] = {}
    answers: dict[str, int] = {}

    for code, value in received:
        if code not in expected:
            errors.setdefault("answers", f"Câu hỏi không tồn tại: {code}.")
            continue
        if code in answers:
            errors.setdefault("answers", f"Câu hỏi bị trả lời nhiều lần: {code}.")
            continue
        if isinstance(value, bool):
            errors.setdefault(code, "Chỉ số lựa chọn không hợp lệ.")
            continue
        if isinstance(value, float) and not value.is_integer():
            errors.setdefault(code, "Chỉ số lựa chọn phải là số nguyên.")
            continue
        try:
            option_index = int(value)
        except (TypeError, ValueError):
            errors.setdefault(code, "Chỉ số lựa chọn phải là số nguyên.")
            continue
        option_count = len(expected[code]["options"])
        if option_index < 0 or option_index >= option_count:
            errors.setdefault(code, f"Lựa chọn phải nằm trong khoảng 0–{option_count - 1}.")
            continue
        answers[code] = option_index

    missing = [code for code in expected if code not in answers]
    if missing:
        preview = ", ".join(sorted(missing)[:8])
        suffix = "…" if len(missing) > 8 else ""
        errors.setdefault(
            "answers",
            f"Còn {len(missing)} câu chưa trả lời ({preview}{suffix}).",
        )

    if errors:
        raise ValidationError(
            "Dữ liệu câu trả lời chưa hợp lệ. Vui lòng kiểm tra lại.",
            errors,
            status=422,
            code="invalid_answers",
        )

    return answers


def parse_priority_list(values: Iterable[str], allowed: Iterable[str]) -> list[str]:
    allowed_set = set(allowed)
    result = []
    for value in values:
        if value not in allowed_set:
            raise ValidationError(
                f"Giá trị ưu tiên không hợp lệ: {value}.", {"priority": "Không hợp lệ."}
            )
        result.append(value)
    return result
