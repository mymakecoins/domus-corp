"""Tests for V1-704: Qdrant, PostgreSQL and zero-downtime vector reindexing optimization."""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from domus_knowledge.access_control import (
    AuthorizedKnowledgeFilter,
    build_authorized_filter,
    derive_access_context,
)
from domus_knowledge.hnsw_config import HNSWConfig, OptimizationPreset, create_optimized_hnsw_config
from domus_knowledge.main import create_app
from domus_knowledge.reindex_engine import QualityValidationResult, VectorReindexEngine
from domus_knowledge.vector_benchmark import BenchmarkWorkloadItem, VectorBenchmarkEngine, VectorBenchmarkReport


def make_filter() -> AuthorizedKnowledgeFilter:
    return build_authorized_filter(
        derive_access_context(
            {
                "tenant_id": "tenant-001",
                "workspace_id": "workspace-001",
                "user_id": "user-001",
                "policy_version": "pol-v1",
                "expires_at": datetime.now(UTC) + timedelta(minutes=5),
                "classification": "INTERNAL",
                "allowed_sources": ["src-001"],
                "allowed_assets": ["asset-001"],
                "allowed_classifications": ["PUBLIC", "INTERNAL"],
            },
            request_id="req-1",
            trace_id="trace-1",
        )
    )


def make_record(
    chunk_id: str,
    tenant_id: str = "tenant-001",
    index_version: str = "v1",
    lexical_terms: str = "database optimization qdrant postgresql",
    vector_score: float = 0.95,
) -> dict[str, Any]:
    return {
        "payload": {
            "tenant_id": tenant_id,
            "workspace_id": "workspace-001",
            "source_id": "src-001",
            "asset_id": "asset-001",
            "classification": "INTERNAL",
            "governance_state": "EFFECTIVE",
            "safety_decision": "ALLOW_WITH_MARKERS",
            "index_version": index_version,
            "policy_version": "pol-v1",
            "chunk_id": chunk_id,
            "version_id": "ver-001",
            "locator": "page:1",
            "evidence_ids": ["ev-1"],
            "checksum": "sha256:" + "a" * 64,
            "freshness": "FRESH",
            "lexical_terms": lexical_terms,
            "vector_score": vector_score,
        }
    }


def test_hnsw_config_creation() -> None:
    config = create_optimized_hnsw_config(preset=OptimizationPreset.BALANCED)
    assert config.m == 16
    assert config.ef_construct == 128
    assert config.hnsw_ef == 64
    assert config.distance == "Cosine"

    high_perf = create_optimized_hnsw_config(preset=OptimizationPreset.HIGH_THROUGHPUT)
    assert high_perf.m == 32
    assert high_perf.ef_construct == 256
    assert high_perf.hnsw_ef == 128


def test_vector_benchmark_engine_runs_workload_and_generates_report() -> None:
    engine = VectorBenchmarkEngine()
    workload = [
        BenchmarkWorkloadItem(
            query="postgresql index",
            authorized_filter=make_filter(),
            expected_chunk_ids={"c1", "c2"},
        ),
        BenchmarkWorkloadItem(
            query="qdrant reindex",
            authorized_filter=make_filter(),
            expected_chunk_ids={"c2", "c3"},
        ),
    ]
    records = [
        make_record("c1", lexical_terms="postgresql index database"),
        make_record("c2", lexical_terms="qdrant postgresql reindex index"),
        make_record("c3", lexical_terms="qdrant reindex search"),
    ]

    report = engine.run_benchmark(workload=workload, records=records)

    assert isinstance(report, VectorBenchmarkReport)
    assert report.p50_ms >= 0.0
    assert report.p95_ms >= report.p50_ms
    assert 0.0 <= report.recall_at_k <= 1.0
    assert 0.0 <= report.precision_at_k <= 1.0
    assert "p50_ms" in report.to_dict()
    assert "risk_gain_analysis" in report.to_dict()


def test_reindex_engine_parallel_indexing_quality_validation_cutover_and_rollback() -> None:
    engine = VectorReindexEngine(active_index_version="v1")
    assert engine.active_index_version == "v1"

    v1_records = [make_record(f"chunk-{i}", index_version="v1") for i in range(5)]
    v2_records = [make_record(f"chunk-{i}", index_version="v2") for i in range(5)]

    # 1. Start parallel reindex for v2
    engine.start_reindex(target_index_version="v2", records=v2_records)
    assert engine.candidate_index_version == "v2"
    assert engine.active_index_version == "v1"  # Still v1 during reindex

    # 2. Quality validation
    workload = [
        BenchmarkWorkloadItem(
            query="database optimization",
            authorized_filter=make_filter(),
            expected_chunk_ids={"chunk-0", "chunk-1"},
        )
    ]
    val_result = engine.validate_quality(candidate_version="v2", workload=workload, min_recall=0.5, min_precision=0.3)
    assert isinstance(val_result, QualityValidationResult)
    assert val_result.is_valid is True

    # 3. Cutover to v2
    cutover_ok = engine.cutover("v2")
    assert cutover_ok is True
    assert engine.active_index_version == "v2"

    # Verify search returns v2 active records
    page = engine.search(query="database", authorized_filter=make_filter(), limit=10)
    assert len(page.results) > 0

    # 4. Rollback to v1
    rollback_ok = engine.rollback()
    assert rollback_ok is True
    assert engine.active_index_version == "v1"


def test_payload_pre_filtering_preserves_acl_and_rls() -> None:
    engine = VectorReindexEngine(active_index_version="v1")
    records = [
        make_record("c-allowed", tenant_id="tenant-001"),
        make_record("c-denied", tenant_id="tenant-other"),  # Cross tenant
    ]
    engine.load_records("v1", records)

    page = engine.search(query="database", authorized_filter=make_filter(), limit=10)
    chunk_ids = [res.citation.chunk_id for res in page.results]

    assert "c-allowed" in chunk_ids
    assert "c-denied" not in chunk_ids  # Must be filtered out pre-ranking


def test_api_vector_optimization_endpoints() -> None:
    app = create_app()
    client = TestClient(app)

    # 1. Status
    res = client.get("/v1/vector/reindex/status")
    assert res.status_code == 200
    assert "active_index_version" in res.json()

    # 2. Start reindex
    res = client.post(
        "/v1/vector/reindex/start",
        json={"target_index_version": "v2"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "REINDEXING"

    # 3. Cutover
    res = client.post(
        "/v1/vector/reindex/cutover",
        json={"target_index_version": "v2"},
    )
    assert res.status_code == 200
    assert res.json()["active_index_version"] == "v2"

    # 4. Rollback
    res = client.post("/v1/vector/reindex/rollback")
    assert res.status_code == 200
    assert res.json()["active_index_version"] == "v1"

    # 5. Benchmark
    res = client.post(
        "/v1/vector/benchmark",
        json={"preset": "BALANCED"},
    )
    assert res.status_code == 200
    assert "p50_ms" in res.json()
