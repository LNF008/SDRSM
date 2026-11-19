"""Development entry point for the SDRSM API.

Usage:
    python run.py                      # http://127.0.0.1:5000
    flask --app run.py seed            # load question bank + demo data
"""

from __future__ import annotations

import os

from app import create_app

app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=app.config.get("DEBUG", False),
    )
