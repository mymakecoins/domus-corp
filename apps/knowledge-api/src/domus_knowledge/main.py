"""Minimal, governed entry point for the Knowledge runtime."""

from fastapi import FastAPI

from domus_knowledge.config import load_config


def create_app() -> FastAPI:
    config = load_config()
    app = FastAPI(title="Domus Corp Knowledge API", version=config.app_version)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "service": "knowledge-api",
            "status": "ok",
            "version": config.app_version,
        }

    return app


app = create_app()
