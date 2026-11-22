"""Small helpers for consistent JSON error responses."""

from __future__ import annotations

from typing import Any

from flask import jsonify

DEFAULT_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "unprocessable_entity",
    429: "too_many_requests",
    500: "internal_error",
}


def error_payload(
    message: str,
    status: int = 400,
    *,
    code: str | None = None,
    fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the standard error envelope used by every endpoint."""
    error: dict[str, Any] = {
        "code": code or DEFAULT_CODES.get(status, "error"),
        "message": message,
    }
    if fields:
        error["fields"] = fields
    return {"error": error}


def error_response(
    message: str,
    status: int = 400,
    *,
    code: str | None = None,
    fields: dict[str, Any] | None = None,
):
    """Return ``(json, status)`` ready to be returned from a view."""
    return jsonify(error_payload(message, status, code=code, fields=fields)), status
