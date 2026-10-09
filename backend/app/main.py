"""GeoLint — FastAPI application entry point."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pathlib import Path

from app.api import api_router
from app.config.settings import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="GeoLint",
        description=(
            "Geospatial file measurement API. "
            "Upload KML or Shapefile ZIP archives and get accurate spatial measurements."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS — allow all origins in development; restrict in production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.app_env == "development" else [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler — never expose raw stack traces to clients
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception for %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please try again later."},
        )

    # Include API routes
    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict:
        return {"status": "ok", "service": "GeoLint"}

    candidate_dirs = [
        Path(__file__).resolve().parent.parent.parent / "frontend",
        Path("/frontend"),
        Path(__file__).resolve().parent.parent / "frontend",
    ]

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        for d in candidate_dirs:
            index_file = d / "index.html"
            if index_file.is_file():
                return FileResponse(str(index_file))
        return JSONResponse(status_code=404, content={"detail": "Frontend not found"})

    return app


app = create_app()
