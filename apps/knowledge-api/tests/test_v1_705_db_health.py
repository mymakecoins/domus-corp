"""Tests for V1-705: Database health monitoring, backpressure shedding, and DBA runbook integration."""

from fastapi.testclient import TestClient

from domus_knowledge.db_health import (
    AlertSeverity,
    BackupHealthStatus,
    DatabaseHealthMetrics,
    DatabaseHealthMonitor,
    GatewayBackpressureEngine,
    QdrantStatus,
)
from domus_knowledge.main import create_app


def test_db_health_monitor_collects_metrics_and_generates_alerts() -> None:
    monitor = DatabaseHealthMonitor()

    # 1. Update healthy metrics
    metrics = DatabaseHealthMetrics(
        active_connections=20,
        max_connections=100,
        waiting_connections=0,
        lock_waits=0,
        deadlock_count=0,
        slow_queries_count=1,
        max_query_time_ms=120.0,
        disk_usage_percent=45.0,
        io_latency_ms=4.5,
        qdrant_status=QdrantStatus.HEALTHY,
        qdrant_latency_ms=12.0,
        backup_status=BackupHealthStatus.OK,
        last_backup_age_hours=2.0,
    )
    monitor.record_metrics(metrics)

    snapshot = monitor.get_snapshot()
    assert snapshot.metrics.pool_saturation_percent == 20.0
    assert len(snapshot.alerts) == 0
    assert snapshot.is_healthy is True

    # 2. Record degraded metrics (high pool saturation, locks, slow queries, backup failed)
    degraded_metrics = DatabaseHealthMetrics(
        active_connections=92,
        max_connections=100,
        waiting_connections=15,
        lock_waits=5,
        deadlock_count=1,
        slow_queries_count=12,
        max_query_time_ms=3500.0,
        disk_usage_percent=92.0,
        io_latency_ms=85.0,
        qdrant_status=QdrantStatus.DEGRADED,
        qdrant_latency_ms=450.0,
        backup_status=BackupHealthStatus.FAILED,
        last_backup_age_hours=28.0,
    )
    monitor.record_metrics(degraded_metrics)

    degraded_snapshot = monitor.get_snapshot()
    assert degraded_snapshot.metrics.pool_saturation_percent == 92.0
    assert degraded_snapshot.is_healthy is False
    assert len(degraded_snapshot.alerts) >= 5

    # Check alert structure and metadata
    pool_alert = next(a for a in degraded_snapshot.alerts if a.metric == "connection_pool_saturation")
    assert pool_alert.owner == "DBA"
    assert pool_alert.severity == AlertSeverity.CRITICAL
    assert "V1-705-dba-health-and-runbooks.md#runbook-1" in pool_alert.runbook_url

    deadlock_alert = next(a for a in degraded_snapshot.alerts if a.metric == "deadlock_count")
    assert deadlock_alert.owner == "DBA"
    assert deadlock_alert.severity == AlertSeverity.CRITICAL

    qdrant_alert = next(a for a in degraded_snapshot.alerts if a.metric == "qdrant_status")
    assert qdrant_alert.owner == "SRE"
    assert qdrant_alert.severity == AlertSeverity.WARNING

    backup_alert = next(a for a in degraded_snapshot.alerts if a.metric == "backup_status")
    assert backup_alert.owner == "DBA"
    assert backup_alert.severity == AlertSeverity.CRITICAL


def test_gateway_backpressure_shedding_on_pool_saturation() -> None:
    monitor = DatabaseHealthMonitor()
    engine = GatewayBackpressureEngine(monitor=monitor, saturation_threshold=85.0, recovery_threshold=75.0)

    # 1. Healthy state - no shedding
    monitor.record_metrics(
        DatabaseHealthMetrics(
            active_connections=50,
            max_connections=100,
            qdrant_status=QdrantStatus.HEALTHY,
        )
    )
    decision = engine.evaluate_admission(request_priority="NORMAL")
    assert decision.should_shed is False
    assert decision.reason == "NORMAL_OPERATION"

    # 2. Pool saturation at 90% -> Shed normal traffic
    monitor.record_metrics(
        DatabaseHealthMetrics(
            active_connections=90,
            max_connections=100,
            qdrant_status=QdrantStatus.HEALTHY,
        )
    )
    decision_normal = engine.evaluate_admission(request_priority="NORMAL")
    assert decision_normal.should_shed is True
    assert decision_normal.code == "GATEWAY_BACKPRESSURE_SHEDDING"

    # High priority / ledger critical requests are NOT shed
    decision_critical = engine.evaluate_admission(request_priority="CRITICAL")
    assert decision_critical.should_shed is False

    # 3. Recovery: saturation drops below recovery threshold (70%)
    monitor.record_metrics(
        DatabaseHealthMetrics(
            active_connections=70,
            max_connections=100,
            qdrant_status=QdrantStatus.HEALTHY,
        )
    )
    decision_recovered = engine.evaluate_admission(request_priority="NORMAL")
    assert decision_recovered.should_shed is False


def test_gateway_backpressure_shedding_on_qdrant_unavailability() -> None:
    monitor = DatabaseHealthMonitor()
    engine = GatewayBackpressureEngine(monitor=monitor)

    monitor.record_metrics(
        DatabaseHealthMetrics(
            active_connections=30,
            max_connections=100,
            qdrant_status=QdrantStatus.UNAVAILABLE,
        )
    )

    decision = engine.evaluate_admission(request_priority="NORMAL", requires_vector_search=True)
    assert decision.should_shed is True
    assert decision.code == "QDRANT_UNAVAILABLE_SHEDDING"


def test_db_health_api_endpoints() -> None:
    app = create_app()
    client = TestClient(app)

    # GET /v1/db/health
    res = client.get("/v1/db/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "metrics" in data
    assert "alerts" in data
    assert "backpressure" in data

    # POST /v1/db/health/simulate-load to verify dynamic metric update
    sim_res = client.post(
        "/v1/db/health/simulate-load",
        json={"active_connections": 95, "max_connections": 100, "qdrant_status": "DEGRADED"},
    )
    assert sim_res.status_code == 200
    assert sim_res.json()["backpressure"]["should_shed"] is True

    # Re-check health after load simulation
    res_after = client.get("/v1/db/health")
    assert res_after.json()["status"] == "DEGRADED"
