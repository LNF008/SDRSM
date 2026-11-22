"""SDRSM Flask application factory."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from app.cli import register_cli
from app.config import get_config
from app.extensions import db
from app.routes import register_blueprints
from app.utils.responses import error_response
from app.utils.validators import ValidationError

API_PREFIX = "/api/"


def _cors_origins(app: Flask) -> list[str]:
    raw = app.config.get("CORS_ORIGINS", "*")
    if isinstance(raw, (list, tuple)):
        return [str(item).strip() for item in raw if str(item).strip()]
    return [item.strip() for item in str(raw).split(",") if item.strip()]


def _register_cors(app: Flask) -> None:
    @app.after_request
    def add_cors_headers(response):
        allowed = _cors_origins(app)
        origin = request.headers.get("Origin")

        if "*" in allowed:
            response.headers.setdefault("Access-Control-Allow-Origin", "*")
        elif origin and origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers.add("Vary", "Origin")

        response.headers.setdefault(
            "Access-Control-Allow-Headers", "Content-Type, Authorization"
        )
        response.headers.setdefault(
            "Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS"
        )
        response.headers.setdefault("Access-Control-Max-Age", "600")

        if request.path.startswith(API_PREFIX):
            response.headers.setdefault("Cache-Control", "no-store")
        return response


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ValidationError)
    def handle_validation_error(exc: ValidationError):
        return error_response(
            exc.message,
            exc.status,
            code=exc.code or "validation_error",
            fields=exc.fields or None,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        if not request.path.startswith(API_PREFIX):
            return exc
        return error_response(
            exc.description or "Yêu cầu không hợp lệ.",
            exc.code or 500,
            code=(exc.name or "http_error").lower().replace(" ", "_"),
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        db.session.rollback()
        app.logger.exception("Unhandled error on %s %s", request.method, request.path)
        return error_response(
            "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.",
            500,
            code="internal_error",
        )


def _register_health(app: Flask) -> None:
    @app.get("/api/health")
    def health():
        database = "ok"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:  # pragma: no cover - only when the DB is unreachable
            database = "unavailable"
        return jsonify(
            {
                "status": "ok" if database == "ok" else "degraded",
                "service": "sdrsm-api",
                "version": "1.0.0",
                "database": database,
            }
        )


def create_app(config_name: str | None = None, overrides: dict | None = None) -> Flask:
    """Build and configure the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(get_config(config_name))
    if overrides:
        app.config.update(overrides)

    # Ensure the Flask instance folder exists (SQLite default lives there).
    # Serverless platforms such as Vercel mount the bundle read-only; the
    # SQLite fallback is redirected to /tmp in that case.
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    app.json.ensure_ascii = False
    app.json.sort_keys = False
    app.url_map.strict_slashes = False

    db.init_app(app)

    # Importing the models registers every table on ``db.metadata``.
    from app import models  # noqa: F401

    register_blueprints(app)
    register_cli(app)
    _register_cors(app)
    _register_error_handlers(app)
    _register_health(app)

    if app.config.get("AUTO_CREATE_TABLES"):
        with app.app_context():
            db.create_all()

    return app
