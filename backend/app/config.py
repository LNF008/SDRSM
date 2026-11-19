"""Application configuration for the SDRSM backend.

Configuration is environment driven:

* ``SECRET_KEY``            – JWT signing key. Always override in production.
* ``DATABASE_URL``          – ``mysql+pymysql://user:pass@host/sdrsm`` for MySQL,
                              otherwise a local SQLite file is used.
* ``JWT_EXPIRES_MINUTES``   – access token lifetime (default 24h).
* ``CORS_ORIGINS``          – comma separated allow-list, ``*`` for development.
* ``AUTO_CREATE_TABLES``    – create missing tables on startup (dev/test only).
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
DEFAULT_SQLITE_PATH = INSTANCE_DIR / "sdrsm.db"

try:  # python-dotenv is a hard dependency, but keep the app importable without it.
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

if load_dotenv is not None:
    # Load backend/.env for every entry point (python run.py, flask CLI, pytest).
    load_dotenv(BASE_DIR / ".env")


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    try:
        return int(raw) if raw is not None else default
    except (TypeError, ValueError):
        return default


class BaseConfig:
    """Settings shared by every environment."""

    SECRET_KEY = os.getenv(
        "SECRET_KEY", "sdrsm-dev-secret-change-me-before-production-32b"
    )
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    JWT_ALGORITHM = "HS256"
    JWT_EXPIRES_MINUTES = _env_int("JWT_EXPIRES_MINUTES", 60 * 24)

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    AUTO_CREATE_TABLES = _env_bool("AUTO_CREATE_TABLES", True)

    # Seeded demo account (only created by ``flask seed``).
    DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@sdrsm.vn")
    DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "Demo@12345")
    DEMO_NAME = os.getenv("DEMO_NAME", "Nguyễn Minh Anh")

    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    AUTO_CREATE_TABLES = _env_bool("AUTO_CREATE_TABLES", True)


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = False
    SECRET_KEY = "sdrsm-testing-secret-key-at-least-32-bytes"
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    SQLALCHEMY_ENGINE_OPTIONS = {}
    AUTO_CREATE_TABLES = True
    JWT_EXPIRES_MINUTES = 60


class ProductionConfig(BaseConfig):
    DEBUG = False
    AUTO_CREATE_TABLES = _env_bool("AUTO_CREATE_TABLES", False)


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "dev": DevelopmentConfig,
    "test": TestingConfig,
    "prod": ProductionConfig,
}


def get_config(name: str | None = None):
    """Return a configuration class for ``name`` (or the active environment)."""
    key = (name or os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").lower()
    return CONFIG_MAP.get(key, DevelopmentConfig)
