"""Blueprint registration."""

from __future__ import annotations

from flask import Flask

from app.routes.assessments import assessments_bp
from app.routes.auth import auth_bp
from app.routes.dashboard import dashboard_bp
from app.routes.recommendations import recommendations_bp
from app.routes.reports import reports_bp
from app.routes.users import users_bp

BLUEPRINTS = (
    auth_bp,
    users_bp,
    assessments_bp,
    reports_bp,
    recommendations_bp,
    dashboard_bp,
)


def register_blueprints(app: Flask) -> None:
    for blueprint in BLUEPRINTS:
        app.register_blueprint(blueprint)
