from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db.session import init_db
from app.routes import admin, auth, dashboard, leaderboard, payments, telegram, tests, words
from app.seed import seed_words


def create_app() -> FastAPI:
    settings = get_settings()
    init_db()
    if settings.seed_default_words:
        seed_words()

    app = FastAPI(title="Uzbek Words Mini App API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(words.router)
    app.include_router(tests.router)
    app.include_router(dashboard.router)
    app.include_router(leaderboard.router)
    app.include_router(admin.router)
    app.include_router(payments.router)
    app.include_router(payments.admin_router)
    app.include_router(telegram.router)

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

        @app.get("/")
        def frontend_root() -> FileResponse:
            return FileResponse(frontend_dist / "index.html")

        @app.get("/{full_path:path}")
        def frontend_index(full_path: str) -> FileResponse:
            return FileResponse(frontend_dist / "index.html")

    return app


app = create_app()
