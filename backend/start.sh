#!/bin/sh
# Run from the backend/ directory.
# Sets PYTHONPATH so both `app` and `telegram_bot` are importable.
PYTHONPATH="$(dirname "$0")/.." \
  "$(dirname "$0")/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 "$@"
