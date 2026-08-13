"""Tests for V1-804: Load, Concurrency, and Resilience Testing Suite."""

import pytest
from fastapi.testclient import TestClient

from domus_knowledge.load_concurrency_resilience import (
    AtomicBudgetLedger,
    ChaosDependency,
    ChaosEngineeringEngine,
    ChaosFaultType,
    LoadTestEngine,
)
from domus_knowledge.main import app


def test_load_test_runner_concurrent_workload_and_slos() -> None:
    engine = LoadTestEngine(max_concurrent_requests=50, queue_capacity=100)
    
    # Run concurrent load test with mixed workloads (chat, retrieval, ingestion)
    report = engine.run_concurrent_load_test(
        num_chat=20,
        num_retrieval=20,
        num_ingestion=10,
        simulated_delay_ms=10.0,
    )

    assert report.total_requests == 50
    assert report.successful_requests == 50
    assert report.failed_requests == 0
    assert report.p95_latency_ms >= 0.0
    assert report.p99_latency_ms >= report.p95_latency_ms
    assert report.error_rate == pytest.approx(0.0)
    assert report.slo_compliance is True
    assert "chat" in report.workload_breakdown
    assert "retrieval" in report.workload_breakdown
    assert "ingestion" in report.workload_breakdown


def test_load_test_runner_admission_control_under_saturation() -> None:
    # Small capacity to trigger shedding / admission control
    engine = LoadTestEngine(max_concurrent_requests=5, queue_capacity=5)

    report = engine.run_concurrent_load_test(
        num_chat=10,
        num_retrieval=10,
        num_ingestion=5,
        simulated_delay_ms=20.0,
    )

    assert report.total_requests == 25
    assert report.rejected_requests > 0
    assert report.admission_controlled is True
    assert report.pool_saturation_percent <= 100.0


def test_atomic_budget_ledger_concurrent_reservations() -> None:
    ledger = AtomicBudgetLedger(initial_balance_cents=1000, balance_ceiling_cents=1000)

    # 15 concurrent reservation requests of 100 cents each (total 1500 > balance 1000)
    results = ledger.reserve_concurrently(
        tenant_id="tenant-alpha",
        num_threads=15,
        amount_cents=100,
    )

    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]

    # Exactly 10 can succeed, 5 must be rejected due to insufficient budget
    assert len(successful) == 10
    assert len(failed) == 5
    assert ledger.get_remaining_balance("tenant-alpha") == 0
    assert ledger.get_total_reserved("tenant-alpha") == 1000
    assert ledger.get_total_reserved("tenant-alpha") <= ledger.balance_ceiling_cents


def test_atomic_budget_ledger_idempotency_prevents_double_spending() -> None:
    ledger = AtomicBudgetLedger(initial_balance_cents=500, balance_ceiling_cents=500)

    res1 = ledger.reserve_budget(
        tenant_id="tenant-beta",
        amount_cents=200,
        idempotency_key="key-unique-123",
    )
    assert res1.success is True
    assert res1.is_duplicate is False

    # Retry with exact same idempotency key
    res2 = ledger.reserve_budget(
        tenant_id="tenant-beta",
        amount_cents=200,
        idempotency_key="key-unique-123",
    )
    assert res2.success is True
    assert res2.is_duplicate is True
    assert res2.reservation_id == res1.reservation_id

    # Total reserved should be 200, not 400
    assert ledger.get_total_reserved("tenant-beta") == 200
    assert ledger.get_remaining_balance("tenant-beta") == 300


def test_chaos_engineering_fail_closed_on_dependency_failures() -> None:
    chaos = ChaosEngineeringEngine()

    # Inject failure into LLM Provider
    exp_provider = chaos.inject_fault(
        dependency=ChaosDependency.LLM_PROVIDER,
        fault_type=ChaosFaultType.TIMEOUT,
    )
    assert exp_provider.dependency == ChaosDependency.LLM_PROVIDER
    assert exp_provider.is_fail_closed is True
    assert exp_provider.status_code in (500, 503, 504)
    assert exp_provider.error_code == "LLM_PROVIDER_TIMEOUT"
    assert exp_provider.audit_logged is True

    # Inject failure into Redis
    exp_redis = chaos.inject_fault(
        dependency=ChaosDependency.REDIS,
        fault_type=ChaosFaultType.CONNECTION_REFUSED,
    )
    assert exp_redis.is_fail_closed is True
    assert exp_redis.error_code == "REDIS_CONNECTION_REFUSED"

    # Inject failure into Qdrant
    exp_qdrant = chaos.inject_fault(
        dependency=ChaosDependency.QDRANT,
        fault_type=ChaosFaultType.UNAVAILABLE,
    )
    assert exp_qdrant.is_fail_closed is True
    assert exp_qdrant.error_code == "QDRANT_UNAVAILABLE"

    # Inject worker panic
    exp_worker = chaos.inject_fault(
        dependency=ChaosDependency.WORKER,
        fault_type=ChaosFaultType.WORKER_PANIC,
    )
    assert exp_worker.is_fail_closed is True
    assert exp_worker.error_code == "WORKER_PANIC"


def test_chaos_engineering_recovery_after_fault_cleared() -> None:
    chaos = ChaosEngineeringEngine()

    chaos.inject_fault(
        dependency=ChaosDependency.REDIS,
        fault_type=ChaosFaultType.CONNECTION_REFUSED,
    )
    assert chaos.is_healthy(ChaosDependency.REDIS) is False

    recovery_report = chaos.recover_dependency(ChaosDependency.REDIS)
    assert recovery_report.is_recovered is True
    assert chaos.is_healthy(ChaosDependency.REDIS) is True


def test_api_endpoints_load_budget_chaos() -> None:
    client = TestClient(app)

    # 1. Load test endpoint
    resp_load = client.post(
        "/api/v1/qa/load-test/run",
        json={
            "num_chat": 5,
            "num_retrieval": 5,
            "num_ingestion": 2,
            "max_concurrent": 20,
        },
    )
    assert resp_load.status_code == 200
    data_load = resp_load.json()
    assert data_load["total_requests"] == 12
    assert "p95_latency_ms" in data_load
    assert "slo_compliance" in data_load

    # 2. Budget reserve endpoint
    resp_budget = client.post(
        "/api/v1/qa/budget/atomic-reserve",
        json={
            "tenant_id": "tenant-api-test",
            "amount_cents": 150,
            "idempotency_key": "api-idem-1",
            "initial_balance_cents": 500,
        },
    )
    assert resp_budget.status_code == 200
    data_budget = resp_budget.json()
    assert data_budget["success"] is True
    assert data_budget["remaining_balance_cents"] == 350

    # 3. Chaos experiment endpoint
    resp_chaos = client.post(
        "/api/v1/qa/chaos/experiment",
        json={
            "dependency": "QDRANT",
            "fault_type": "UNAVAILABLE",
        },
    )
    assert resp_chaos.status_code == 200
    data_chaos = resp_chaos.json()
    assert data_chaos["is_fail_closed"] is True
    assert data_chaos["error_code"] == "QDRANT_UNAVAILABLE"


def test_atomic_budget_ledger_concurrent_idempotent_requests() -> None:
    ledger = AtomicBudgetLedger(initial_balance_cents=1000, balance_ceiling_cents=1000)
    
    # 10 concurrent threads sending identical idempotency key
    same_key = "idempotent-concurrent-key-999"
    results = []

    from concurrent.futures import ThreadPoolExecutor, as_completed
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(
                ledger.reserve_budget,
                tenant_id="tenant-idempotent",
                amount_cents=100,
                idempotency_key=same_key,
            )
            for _ in range(10)
        ]
        for f in as_completed(futures):
            results.append(f.result())

    duplicates = [r for r in results if r.is_duplicate]
    originals = [r for r in results if not r.is_duplicate]

    assert len(originals) == 1
    assert len(duplicates) == 9
    assert ledger.get_remaining_balance("tenant-idempotent") == 900
    assert ledger.get_total_reserved("tenant-idempotent") == 100


def test_load_test_engine_with_chaos_injection() -> None:
    chaos = ChaosEngineeringEngine()
    chaos.inject_fault(
        dependency=ChaosDependency.LLM_PROVIDER,
        fault_type=ChaosFaultType.TIMEOUT,
    )
    
    engine = LoadTestEngine(max_concurrent_requests=50, queue_capacity=100)
    report = engine.run_concurrent_load_test(
        num_chat=10,
        num_retrieval=5,
        num_ingestion=5,
        simulated_delay_ms=5.0,
        chaos_engine=chaos,
    )

    # Chat relies on LLM_PROVIDER which is unhealthy, so chat requests fail closed
    assert report.total_requests == 20
    assert report.failed_requests == 10
    assert report.successful_requests == 10
    assert report.error_rate == pytest.approx(0.5)
    assert report.slo_compliance is False


def test_chaos_engineering_matrix_coverage() -> None:
    chaos = ChaosEngineeringEngine()
    
    for dep in ChaosDependency:
        for fault in ChaosFaultType:
            res = chaos.inject_fault(dependency=dep, fault_type=fault)
            assert res.is_fail_closed is True
            assert res.status_code in (500, 503, 504)
            assert res.audit_logged is True
            assert res.runbook_url.startswith("https://docs.domuscorp.internal/runbooks/")


def test_api_endpoints_chaos_recover_and_status() -> None:
    client = TestClient(app)

    # Clear any previous test residual chaos state
    for dep in ChaosDependency:
        client.post("/api/v1/qa/chaos/recover", json={"dependency": dep.value})

    # Check initial chaos status (all healthy)
    resp_status1 = client.get("/api/v1/qa/chaos/status")
    assert resp_status1.status_code == 200
    assert resp_status1.json()["unhealthy_dependencies"] == []


    # Inject fault into REDIS
    client.post(
        "/api/v1/qa/chaos/experiment",
        json={"dependency": "REDIS", "fault_type": "CONNECTION_REFUSED"},
    )

    # Check status again
    resp_status2 = client.get("/api/v1/qa/chaos/status")
    assert resp_status2.status_code == 200
    assert "REDIS" in resp_status2.json()["unhealthy_dependencies"]

    # Recover REDIS
    resp_recover = client.post(
        "/api/v1/qa/chaos/recover",
        json={"dependency": "REDIS"},
    )
    assert resp_recover.status_code == 200
    assert resp_recover.json()["is_recovered"] is True

    # Confirm healthy status restored
    resp_status3 = client.get("/api/v1/qa/chaos/status")
    assert resp_status3.status_code == 200
    assert resp_status3.json()["unhealthy_dependencies"] == []

