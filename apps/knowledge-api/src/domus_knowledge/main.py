"""Minimal, governed entry point for the Knowledge runtime."""

import os
import uuid
from typing import Any, AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from domus_knowledge.access_control import build_authorized_filter, derive_access_context
from domus_knowledge.config import load_config
from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.decision_support import ComparisonResult, DecisionSupportEngine, SynthesisResult
from domus_knowledge.knowledge_gaps import KnowledgeGap, KnowledgeGapDetector
from domus_knowledge.model_gateway_client import ModelGatewayClient, ModelGatewayError
from domus_knowledge.process_assistant import ProcessAssistantEngine, ProcessAssistantResponse
from domus_knowledge.quality_loop import FeedbackRecord, QualityLoopEngine, QualityLoopSuggestion
from domus_knowledge.retrieval import hybrid_search


class OrchestrateRequest(BaseModel):
    query: str = Field(..., description="Pergunta ou intenção do usuário.")
    user_roles: list[str] = Field(default_factory=lambda: ["user"], description="Papéis/escopos do usuário.")
    evidences: list[dict[str, Any]] = Field(default_factory=list, description="Lista de trechos recuperados.")
    max_tokens: int = Field(1024, description="Limite máximo de tokens de saída.")
    idempotency_key: Optional[str] = Field(None, description="Chave de idempotência.")


class CompareRequest(OrchestrateRequest):
    alternatives: Optional[list[str]] = Field(None, description="Lista opcional de alternativas para comparação.")


class ResolveSuggestionRequest(BaseModel):
    before_state: dict[str, Any] = Field(default_factory=dict)
    after_state: dict[str, Any] = Field(default_factory=dict)
    owner: str = Field("Knowledge Owner")


class UpdateKnowledgeGapRequest(BaseModel):
    status: Optional[str] = None
    assigned_owner: Optional[str] = None
    candidate_sources: Optional[list[str]] = None



orchestrator = ContextOrchestrator()
control_plane_url = os.getenv("CONTROL_PLANE_URL", "http://localhost:3000")
gateway_client = ModelGatewayClient(base_url=control_plane_url)


def create_app() -> FastAPI:
    config = load_config()
    app = FastAPI(title="Domus Corp Knowledge API", version=config.app_version)
    quality_loop_engine = QualityLoopEngine()
    knowledge_gap_detector = KnowledgeGapDetector()

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

    @app.post("/intelligence/query")
    @app.post("/v1/intelligence/orchestrate")
    async def orchestrate_and_execute(req: OrchestrateRequest) -> dict[str, Any]:
        idempotency_key = req.idempotency_key or str(uuid.uuid4())

        orchestration = orchestrator.orchestrate(
            query=req.query,
            user_roles=req.user_roles,
            evidences=req.evidences,
            max_tokens=req.max_tokens,
        )

        eval_result = orchestrator.evaluate_semantic_state(
            query=req.query,
            user_roles=req.user_roles,
            evidences=req.evidences,
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
                "semantic_state": eval_result.state.value,
                "semantic_metadata": eval_result.metadata.model_dump(),
                "conflicting_sources": eval_result.conflicting_sources,
                "outdated_sources": eval_result.outdated_sources,
            }
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

    @app.post("/v1/intelligence/orchestrate/stream")
    async def orchestrate_and_stream(req: OrchestrateRequest) -> StreamingResponse:
        idempotency_key = req.idempotency_key or str(uuid.uuid4())

        orchestration = orchestrator.orchestrate(
            query=req.query,
            user_roles=req.user_roles,
            evidences=req.evidences,
            max_tokens=req.max_tokens,
        )

        eval_result = orchestrator.evaluate_semantic_state(
            query=req.query,
            user_roles=req.user_roles,
            evidences=req.evidences,
        )

        async def event_generator() -> AsyncGenerator[str, None]:
            try:
                async for chunk in gateway_client.stream(
                    idempotency_key=idempotency_key,
                    messages=orchestration.messages,
                    max_tokens=orchestration.maximum_output_tokens,
                ):
                    yield f"data: {chunk}\n\n"
                # Send completed event with semantic state
                completed_payload = {
                    "type": "completed",
                    "semantic_state": eval_result.state.value,
                    "semantic_metadata": eval_result.metadata.model_dump(),
                }
                yield f"event: completed\ndata: {completed_payload}\n\n"
            except ModelGatewayError as err:
                yield f"event: error\ndata: {err}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    process_engine = ProcessAssistantEngine(gateway_client=gateway_client)
    decision_engine = DecisionSupportEngine(gateway_client=gateway_client)

    @app.post("/v1/intelligence/process", response_model=ProcessAssistantResponse)
    async def process_assistant_endpoint(req: OrchestrateRequest) -> ProcessAssistantResponse:
        try:
            return await process_engine.process_query(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                max_tokens=req.max_tokens,
            )
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

    @app.post("/v1/intelligence/synthesis", response_model=SynthesisResult)
    async def synthesis_endpoint(req: OrchestrateRequest) -> SynthesisResult:
        try:
            return await decision_engine.synthesize(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                max_tokens=req.max_tokens,
            )
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

    @app.post("/v1/intelligence/compare", response_model=ComparisonResult)
    async def compare_endpoint(req: CompareRequest) -> ComparisonResult:
        try:
            return await decision_engine.compare(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                alternatives=req.alternatives,
                max_tokens=req.max_tokens,
            )
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

    # Quality Loop Endpoints
    @app.post("/v1/quality-loop/feedback", response_model=FeedbackRecord)
    async def submit_feedback_endpoint(feedback: FeedbackRecord) -> FeedbackRecord:
        return await quality_loop_engine.submit_feedback(feedback)

    @app.get("/v1/quality-loop/feedback", response_model=list[FeedbackRecord])
    async def list_feedback_endpoint(
        tenant_id: str,
        workspace_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[FeedbackRecord]:
        return await quality_loop_engine.list_feedbacks(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            status=status,
        )

    @app.get("/v1/quality-loop/suggestions", response_model=list[QualityLoopSuggestion])
    async def list_suggestions_endpoint(
        tenant_id: str,
        status: Optional[str] = None,
    ) -> list[QualityLoopSuggestion]:
        return await quality_loop_engine.list_suggestions(
            tenant_id=tenant_id,
            status=status,
        )

    @app.post("/v1/quality-loop/suggestions/{suggestion_id}/resolve", response_model=QualityLoopSuggestion)
    async def resolve_suggestion_endpoint(
        suggestion_id: str,
        req: ResolveSuggestionRequest,
    ) -> QualityLoopSuggestion:
        try:
            return await quality_loop_engine.resolve_suggestion(
                suggestion_id=suggestion_id,
                before_state=req.before_state,
                after_state=req.after_state,
                owner=req.owner,
            )
        except ValueError as err:
            raise HTTPException(status_code=404, detail=str(err))

    # Knowledge Gap Endpoints
    @app.post("/v1/knowledge-gaps/detect", response_model=list[KnowledgeGap])
    async def detect_knowledge_gaps_endpoint(
        logs: list[dict[str, Any]],
        tenant_id: str,
        min_frequency: int = 1,
    ) -> list[KnowledgeGap]:
        return await knowledge_gap_detector.detect_gaps(
            tenant_id=tenant_id,
            retrieval_logs=logs,
            min_frequency=min_frequency,
        )

    @app.get("/v1/knowledge-gaps", response_model=list[KnowledgeGap])
    async def list_knowledge_gaps_endpoint(
        tenant_id: str,
        status: Optional[str] = None,
    ) -> list[KnowledgeGap]:
        return await knowledge_gap_detector.list_gaps(
            tenant_id=tenant_id,
            status=status,
        )

    @app.patch("/v1/knowledge-gaps/{gap_id}", response_model=KnowledgeGap)
    async def update_knowledge_gap_endpoint(
        gap_id: str,
        req: UpdateKnowledgeGapRequest,
    ) -> KnowledgeGap:
        try:
            return await knowledge_gap_detector.update_gap(
                gap_id=gap_id,
                status=req.status,
                assigned_owner=req.assigned_owner,
                candidate_sources=req.candidate_sources,
            )
        except ValueError as err:
            raise HTTPException(status_code=404, detail=str(err))

    return app


app = create_app()

