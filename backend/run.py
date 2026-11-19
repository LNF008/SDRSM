"""Application entry point for the SDRSM API.

Works both locally and on Vercel:

    python run.py                      # http://127.0.0.1:5000
    flask --app run.py seed            # load question bank + demo data

Vercel loads this module as ``backend.run:app`` (see the root
``pyproject.toml``), so the backend directory must be importable as the
top-level package root before importing ``app``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import create_app  # noqa: E402  (path setup must run first)

app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=app.config.get("DEBUG", False),
    )
