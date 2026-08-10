"""Minimal, governed entry point for the Knowledge runtime."""

from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse

from domus_knowledge.access_control import build_authorized_filter, derive_access_context
from domus_knowledge.config import load_config
from domus_knowledge.retrieval import hybrid_search


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

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "OK"}

    @app.post("/api/v1/knowledge/access-check", response_model=None)
    async def access_check(request: Request) -> Response | dict[str, Any]:
        try:
            body = await request.json()
            context = derive_access_context(
                body.get("policy", {}),
                request_id=body.get("request_id", "req-1"),
                trace_id=body.get("trace_id", "tr-1"),
            )
            flt = build_authorized_filter(context)
            return {"allowed": True, "filter": flt.values}
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"code": "KNOWLEDGE_ACCESS_DENIED", "detail": "Access denied"},
            )

    @app.post("/api/v1/knowledge/search", response_model=None)
    async def search(request: Request) -> Response | dict[str, Any]:
        try:
            body = await request.json()
            context = derive_access_context(
                body.get("policy", {}),
                request_id=body.get("request_id", "req-1"),
                trace_id=body.get("trace_id", "tr-1"),
            )
            flt = build_authorized_filter(context)
            res = hybrid_search(
                query=body.get("query", ""),
                authorized_filter=flt,
                records=body.get("records", ()),
            )
            return {
                "results": [
                    {
                        "chunk_id": item.citation.chunk_id,
                        "asset_id": item.citation.asset_id,
                        "version_id": item.citation.version_id,
                        "source_id": item.citation.source_id,
                        "locator": item.citation.locator,
                        "score": item.score,
                        "freshness": item.citation.freshness,
                    }
                    for item in res.results
                ],
                "next_cursor": res.next_cursor,
            }
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"code": "KNOWLEDGE_ACCESS_DENIED", "detail": "Access denied"},
            )

    return app


app = create_app()
