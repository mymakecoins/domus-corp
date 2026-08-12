"""Minimal, governed entry point for the Knowledge runtime."""

import os
import uuid
from typing import Any, AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from domus_knowledge.access_control import build_authorized_filter, derive_access_context
from domus_knowledge.briefings import BriefingEngine, BriefingPreferences, BriefingRecord
from domus_knowledge.change_detection import ChangeImpactDetector, ChangeRecord
from domus_knowledge.config import load_config
from datetime import UTC, datetime, timedelta
from domus_knowledge.history_retention import (
    ArchivedHistoryQueryEngine,
    ArchivedQueryRequest,
    AutoPartitionManager,
    DataClass,
    DataRetentionMatrix,
    HistoryArchiveEngine,
    RetentionPolicy,
)
from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.decision_support import ComparisonResult, DecisionSupportEngine, SynthesisResult
from domus_knowledge.hnsw_config import OptimizationPreset
from domus_knowledge.knowledge_gaps import KnowledgeGap, KnowledgeGapDetector
from domus_knowledge.model_gateway_client import ModelGatewayClient, ModelGatewayError
from domus_knowledge.operational_insights import InsightFeedback, OperationalInsight, OperationalInsightsEngine
from domus_knowledge.process_assistant import ProcessAssistantEngine, ProcessAssistantResponse
from domus_knowledge.quality_loop import FeedbackRecord, QualityLoopEngine, QualityLoopSuggestion
from domus_knowledge.reindex_engine import VectorReindexEngine
from domus_knowledge.retrieval import hybrid_search
from domus_knowledge.vector_benchmark import VectorBenchmarkEngine
from domus_knowledge.db_health import (
    BackupHealthStatus,
    DatabaseHealthMetrics,
    DatabaseHealthMonitor,
    GatewayBackpressureEngine,
    QdrantStatus,
)
from app.routers.meetings import router as meetings_router


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


class DetectChangeRequest(BaseModel):
    tenant_id: str
    workspace_id: str
    source_id: str
    source_type: str
    before_content: str
    after_content: str
    affected_domains: Optional[list[str]] = None
    owners: Optional[list[str]] = None


class GenerateBriefingRequest(BaseModel):
    tenant_id: str
    workspace_id: str
    user_id: str
    role: str
    time_window: str = "7d"


class UpdateBriefingPreferencesRequest(BaseModel):
    tenant_id: str
    workspace_id: str
    user_id: str
    is_paused: bool = False
    periodicity: str = "weekly"


class EvaluateInsightsRequest(BaseModel):
    tenant_id: str
    workspace_id: str
    signals: list[dict[str, Any]]


class ReviewInsightRequest(BaseModel):
    status: str
    reviewer: str = "Knowledge Owner"


class SubmitInsightFeedbackRequest(BaseModel):
    user_id: str
    feedback_type: str
    comment: Optional[str] = None


class CheckPartitionRequest(BaseModel):
    table_name: str
    months_ahead: int = 2


class RunArchiveRequest(BaseModel):
    data_class: str
    records: list[dict[str, Any]] = Field(default_factory=list)


class SubmitArchivedQueryRequest(BaseModel):
    tenant_id: str
    workspace_id: str
    actor_id: str
    purpose: str
    data_class: str
    query_from: str
    query_to: str


class StartReindexRequest(BaseModel):
    target_index_version: str


class CutoverRequest(BaseModel):
    target_index_version: Optional[str] = None


class BenchmarkRequest(BaseModel):
    preset: str = "BALANCED"


class SimulateDbLoadRequest(BaseModel):
    active_connections: int = 20
    max_connections: int = 100
    waiting_connections: int = 0
    lock_waits: int = 0
    deadlock_count: int = 0
    slow_queries_count: int = 0
    max_query_time_ms: float = 0.0
    disk_usage_percent: float = 40.0
    io_latency_ms: float = 5.0
    qdrant_status: str = "HEALTHY"
    qdrant_latency_ms: float = 10.0
    backup_status: str = "OK"
    last_backup_age_hours: float = 2.0


orchestrator = ContextOrchestrator()
control_plane_url = os.getenv("CONTROL_PLANE_URL", "http://localhost:3000")
gateway_client = ModelGatewayClient(base_url=control_plane_url)


def create_app() -> FastAPI:
    config = load_config()
    app = FastAPI(title="Domus Corp Knowledge API", version=config.app_version)
    quality_loop_engine = QualityLoopEngine()
    knowledge_gap_detector = KnowledgeGapDetector()
    change_detector = ChangeImpactDetector()
    briefing_engine = BriefingEngine(change_repo=change_detector.repo)
    insights_engine = OperationalInsightsEngine()
    reindex_engine = VectorReindexEngine()
    benchmark_engine = VectorBenchmarkEngine()
    db_health_monitor = DatabaseHealthMonitor()
    gateway_backpressure_engine = GatewayBackpressureEngine(monitor=db_health_monitor)

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

    @app.get("/v1/db/health")
    async def get_db_health_endpoint() -> dict[str, Any]:
        snapshot = db_health_monitor.get_snapshot()
        backpressure = gateway_backpressure_engine.evaluate_admission()
        return {
            "status": "HEALTHY" if snapshot.is_healthy else "DEGRADED",
            "metrics": snapshot.metrics.to_dict(),
            "alerts": [a.to_dict() for a in snapshot.alerts],
            "backpressure": backpressure.to_dict(),
            "checked_at": snapshot.checked_at.isoformat(),
        }

    @app.post("/v1/db/health/simulate-load")
    async def simulate_db_load_endpoint(req: SimulateDbLoadRequest) -> dict[str, Any]:
        try:
            q_status = QdrantStatus(req.qdrant_status)
            b_status = BackupHealthStatus(req.backup_status)
        except ValueError as err:
            raise HTTPException(status_code=400, detail=f"Invalid status value: {err}")

        metrics = DatabaseHealthMetrics(
            active_connections=req.active_connections,
            max_connections=req.max_connections,
            waiting_connections=req.waiting_connections,
            lock_waits=req.lock_waits,
            deadlock_count=req.deadlock_count,
            slow_queries_count=req.slow_queries_count,
            max_query_time_ms=req.max_query_time_ms,
            disk_usage_percent=req.disk_usage_percent,
            io_latency_ms=req.io_latency_ms,
            qdrant_status=q_status,
            qdrant_latency_ms=req.qdrant_latency_ms,
            backup_status=b_status,
            last_backup_age_hours=req.last_backup_age_hours,
        )
        db_health_monitor.record_metrics(metrics)
        snapshot = db_health_monitor.get_snapshot()
        backpressure = gateway_backpressure_engine.evaluate_admission()
        return {
            "status": "HEALTHY" if snapshot.is_healthy else "DEGRADED",
            "metrics": snapshot.metrics.to_dict(),
            "alerts": [a.to_dict() for a in snapshot.alerts],
            "backpressure": backpressure.to_dict(),
        }

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

    # V1-507 Change Detection Endpoints
    @app.post("/intelligence/changes/detect", response_model=ChangeRecord)
    async def detect_change_endpoint(req: DetectChangeRequest) -> ChangeRecord:
        return change_detector.detect_change(
            tenant_id=req.tenant_id,
            workspace_id=req.workspace_id,
            source_id=req.source_id,
            source_type=req.source_type,
            before_content=req.before_content,
            after_content=req.after_content,
            affected_domains=req.affected_domains,
            owners=req.owners,
        )

    @app.get("/intelligence/changes", response_model=list[ChangeRecord])
    async def list_changes_endpoint(tenant_id: str, workspace_id: Optional[str] = None) -> list[ChangeRecord]:
        return change_detector.repo.list_records(tenant_id, workspace_id)

    # V1-508 Briefing Endpoints
    @app.post("/intelligence/briefings/generate", response_model=BriefingRecord)
    async def generate_briefing_endpoint(req: GenerateBriefingRequest) -> BriefingRecord:
        return briefing_engine.generate_briefing(
            tenant_id=req.tenant_id,
            workspace_id=req.workspace_id,
            user_id=req.user_id,
            role=req.role,
            time_window=req.time_window,
        )

    @app.get("/intelligence/briefings", response_model=list[BriefingRecord])
    async def list_briefings_endpoint(tenant_id: str, workspace_id: Optional[str] = None) -> list[BriefingRecord]:
        return briefing_engine.briefing_repo.list_briefings(tenant_id, workspace_id)

    @app.post("/intelligence/briefings/preferences", response_model=BriefingPreferences)
    async def update_briefing_preferences_endpoint(req: UpdateBriefingPreferencesRequest) -> BriefingPreferences:
        return briefing_engine.update_preferences(
            tenant_id=req.tenant_id,
            workspace_id=req.workspace_id,
            user_id=req.user_id,
            is_paused=req.is_paused,
            periodicity=req.periodicity,
        )

    # V1-509 Operational Insights Endpoints
    @app.post("/intelligence/insights/evaluate", response_model=list[OperationalInsight])
    async def evaluate_insights_endpoint(req: EvaluateInsightsRequest) -> list[OperationalInsight]:
        return insights_engine.evaluate_signals(
            tenant_id=req.tenant_id,
            workspace_id=req.workspace_id,
            signals=req.signals,
        )

    @app.get("/intelligence/insights", response_model=list[OperationalInsight])
    async def list_insights_endpoint(tenant_id: str, workspace_id: Optional[str] = None) -> list[OperationalInsight]:
        return insights_engine.repo.list_insights(tenant_id, workspace_id)

    @app.post("/intelligence/insights/{insight_id}/review", response_model=OperationalInsight)
    async def review_insight_endpoint(insight_id: str, req: ReviewInsightRequest) -> OperationalInsight:
        res = insights_engine.review_insight(insight_id=insight_id, status=req.status, reviewer=req.reviewer)
        if not res:
            raise HTTPException(status_code=404, detail="Insight not found")
        return res

    @app.post("/intelligence/insights/{insight_id}/feedback", response_model=InsightFeedback)
    async def submit_insight_feedback_endpoint(insight_id: str, req: SubmitInsightFeedbackRequest) -> InsightFeedback:
        return insights_engine.submit_feedback(
            insight_id=insight_id,
            user_id=req.user_id,
            feedback_type=req.feedback_type,
            comment=req.comment,
        )

    # V1-704 Vector Optimization & Reindex Endpoints
    @app.get("/v1/vector/reindex/status")
    async def get_reindex_status_endpoint() -> dict[str, Any]:
        return reindex_engine.get_status()

    @app.post("/v1/vector/reindex/start")
    async def start_reindex_endpoint(req: StartReindexRequest) -> dict[str, Any]:
        try:
            reindex_engine.start_reindex(target_index_version=req.target_index_version)
            return reindex_engine.get_status()
        except Exception as err:
            raise HTTPException(status_code=400, detail=str(err))

    @app.post("/v1/vector/reindex/cutover")
    async def cutover_endpoint(req: CutoverRequest) -> dict[str, Any]:
        try:
            reindex_engine.cutover(target_index_version=req.target_index_version)
            return reindex_engine.get_status()
        except Exception as err:
            raise HTTPException(status_code=400, detail=str(err))

    @app.post("/v1/vector/reindex/rollback")
    async def rollback_endpoint() -> dict[str, Any]:
        try:
            reindex_engine.rollback()
            return reindex_engine.get_status()
        except Exception as err:
            raise HTTPException(status_code=400, detail=str(err))

    @app.post("/v1/vector/benchmark")
    async def run_vector_benchmark_endpoint(req: BenchmarkRequest) -> dict[str, Any]:
        try:
            preset_enum = OptimizationPreset(req.preset)
        except ValueError:
            preset_enum = OptimizationPreset.BALANCED
        report = benchmark_engine.run_benchmark(workload=[], records=[], preset=preset_enum)
        return report.to_dict()

    # V1-703 History Retention & Partitioning Endpoints
    retention_matrix = DataRetentionMatrix()
    partition_manager = AutoPartitionManager()
    archive_engine = HistoryArchiveEngine(storage_dir="./cold_archive_storage", retention_matrix=retention_matrix)
    archived_query_engine = ArchivedHistoryQueryEngine(storage_dir="./cold_archive_storage")

    @app.get("/v1/history/retention/matrix")
    async def get_retention_matrix_endpoint() -> dict[str, Any]:
        return {"policies": retention_matrix.list_policies()}

    @app.post("/v1/history/partition/check-and-create")
    async def check_and_create_partitions_endpoint(req: CheckPartitionRequest) -> dict[str, Any]:
        created = partition_manager.check_and_create_partitions(
            table_name=req.table_name,
            months_ahead=req.months_ahead,
        )
        return {
            "table_name": req.table_name,
            "created_count": len(created),
            "partitions": [
                {
                    "partition_name": p.partition_name,
                    "start_bound": p.start_bound,
                    "end_bound": p.end_bound,
                    "index_ddl": p.index_ddl,
                }
                for p in created
            ],
        }

    @app.post("/v1/history/archive/run")
    async def run_archive_job_endpoint(req: RunArchiveRequest) -> dict[str, Any]:
        try:
            dc_enum = DataClass(req.data_class)
        except ValueError:
            dc_enum = DataClass.AUDIT_EVENT
        manifest, receipt = archive_engine.execute_archive_and_purge(data_class=dc_enum, records=req.records)
        return {
            "archive_id": manifest.archive_id,
            "data_class": manifest.data_class.value,
            "archived_count": manifest.archived_count,
            "checksum_sha256": manifest.checksum_sha256,
            "status": manifest.status,
            "receipt_id": receipt.receipt_id,
        }

    @app.post("/v1/history/archive/query")
    async def submit_archived_query_endpoint(req: SubmitArchivedQueryRequest) -> dict[str, Any]:
        try:
            dc_enum = DataClass(req.data_class)
        except ValueError:
            dc_enum = DataClass.AUDIT_EVENT
        try:
            q_from = datetime.fromisoformat(req.query_from.replace("Z", "+00:00"))
            q_to = datetime.fromisoformat(req.query_to.replace("Z", "+00:00"))
        except Exception:
            q_from = datetime.now(UTC) - timedelta(days=1)
            q_to = datetime.now(UTC)

        try:
            query_req = ArchivedQueryRequest(
                tenant_id=req.tenant_id,
                workspace_id=req.workspace_id,
                actor_id=req.actor_id,
                purpose=req.purpose,
                data_class=dc_enum,
                query_from=q_from,
                query_to=q_to,
            )
            query_id = archived_query_engine.submit_async_query(query_req)
            return {"query_id": query_id, "status": "SUBMITTED"}
        except ValueError as err:
            raise HTTPException(status_code=400, detail=str(err))

    @app.get("/v1/history/archive/query/{query_id}")
    async def get_archived_query_result_endpoint(query_id: str) -> dict[str, Any]:
        try:
            res = archived_query_engine.get_query_result(query_id)
            return {
                "query_id": res.query_id,
                "status": res.status,
                "audit_access_event_id": res.audit_access_event_id,
                "records": res.records,
                "result_count": res.result_count,
                "executed_at": res.executed_at,
            }
        except KeyError:
            raise HTTPException(status_code=404, detail="Query result not found")

    @app.post("/api/v1/evals/benchmark")
    async def run_evals_benchmark_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
        from domus_knowledge.evals_framework import EvalBenchmarkRunner, EvaluationDataset
        dataset = EvaluationDataset(
            dataset_id=payload.get("dataset_id", "ds-unknown"),
            version=payload.get("dataset_version", "1.0.0"),
            items=payload.get("items", []),
        )
        responses = payload.get("responses", [])
        model_ver = payload.get("model_version", "default")
        prompt_ver = payload.get("prompt_version", "default")

        runner = EvalBenchmarkRunner()
        report = runner.run_benchmark(
            dataset=dataset,
            responses=responses,
            model_version=model_ver,
            prompt_version=prompt_ver,
        )
        return report.model_dump()

    @app.post("/api/v1/evals/compare")
    async def compare_evals_regression_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
        from domus_knowledge.evals_framework import RegressionAnalyzer
        analyzer = RegressionAnalyzer()
        baseline_ver = payload.get("baseline_version", "v1.0")
        cand_ver = payload.get("candidate_version", "v1.1")
        baseline = payload.get("baseline", {})
        candidate = payload.get("candidate", {})
        threshold = payload.get("threshold_delta", 0.05)

        comp = analyzer.compare_runs(
            baseline_version=baseline_ver,
            candidate_version=cand_ver,
            baseline=baseline,
            candidate=candidate,
            threshold_delta=threshold,
        )
        return comp.model_dump()

    app.include_router(meetings_router)

    return app


app = create_app()
