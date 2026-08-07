"""Minimal, governed entry point for the Knowledge runtime."""

from os import getenv

from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="Domus Corp Knowledge API", version=getenv("APP_VERSION", "dev"))

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "service": "knowledge-api",
            "status": "ok",
            "version": getenv("APP_VERSION", "dev"),
        }

    return app


app = create_app()
