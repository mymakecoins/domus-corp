"""Minimal, governed entry point for the Knowledge runtime."""

import uuid
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from domus_knowledge.access_control import build_authorized_filter, derive_access_context
from domus_knowledge.config import load_config
from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.model_gateway_client import ModelGatewayClient, ModelGatewayError
from domus_knowledge.retrieval import hybrid_search


class OrchestrateRequest(BaseModel):
    query: str = Field(..., description="Pergunta ou intenção do usuário.")
    user_roles: list[str] = Field(default_factory=lambda: ["user"], description="Papéis/escopos do usuário.")
    evidences: list[dict[str, Any]] = Field(default_factory=list, description="Lista de trechos recuperados.")
    max_tokens: int = Field(1024, description="Limite máximo de tokens de saída.")
    idempotency_key: Optional[str] = Field(None, description="Chave de idempotência.")


orchestrator = ContextOrchestrator()
gateway_client = ModelGatewayClient()


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

    @app.post("/v1/intelligence/orchestrate")
    async def orchestrate_and_execute(req: OrchestrateRequest) -> dict[str, Any]:
        idempotency_key = req.idempotency_key or str(uuid.uuid4())

        orchestration = orchestrator.orchestrate(
            query=req.query,
            user_roles=req.user_roles,
            evidences=req.evidences,
            max_tokens=req.max_tokens,
        )

        try:
            result = await gateway_client.execute(
                idempotency_key=idempotency_key,
                messages=orchestration.messages,
                max_tokens=orchestration.maximum_output_tokens,
            )
            return {
                "orchestration": orchestration.model_dump(),
                "gateway_result": result,
            }
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

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
