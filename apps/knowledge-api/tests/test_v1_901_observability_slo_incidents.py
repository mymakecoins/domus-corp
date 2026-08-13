"""Tests for V1-901: OpenTelemetry observabilidade, SLOs, dashboards, alertas e resposta a incidentes."""

import pytest
from fastapi.testclient import TestClient

from domus_knowledge.main import create_app
from domus_knowledge.telemetry_observability import (
    AlertSeverity,
    ContainmentActionType,
    IncidentRecord,
    IncidentResponseManager,
    IncidentStatus,
    RedactionProcessor,
    SLODashboard,
    SLOMonitoringEngine,
    SLOTargetDomain,
    TelemetryEngine,
    TelemetrySpan,
)


def test_telemetry_engine_correlates_request_id_and_redacts_secrets() -> None:
    engine = TelemetryEngine()

    raw_payload = {
        "user_email": "usuario@empresa.com.br",
        "api_key": "sk-proj-secret-key-12345",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret",
        "cpf": "123.456.789-00",
        "password": "SuperSecretPassword123!",
        "action": "query_knowledge_base",
        "workspace_id": "ws-finance-01",
    }

    span = engine.record_span(
        request_id="req-trace-9901",
        domain=SLOTargetDomain.GATEWAY,
        service_name="model-gateway",
        operation_name="inference_request",
        attributes=raw_payload,
        duration_ms=45.5,
        status_code=200,
    )

    assert span.request_id == "req-trace-9901"
    assert span.attributes["workspace_id"] == "ws-finance-01"
    assert span.attributes["action"] == "query_knowledge_base"

    # Redacted sensitive attributes check
    assert span.attributes["api_key"] == "[REDACTED_SECRET]"
    assert span.attributes["authorization"] == "[REDACTED_SECRET]"
    assert span.attributes["password"] == "[REDACTED_SECRET]"
    assert span.attributes["user_email"] == "[REDACTED_PII]"
    assert span.attributes["cpf"] == "[REDACTED_PII]"

    # Verify telemetry snapshot retains redaction stats
    snapshot = engine.get_snapshot()
    assert snapshot["total_spans"] == 1
    assert snapshot["redacted_fields_count"] >= 5
    assert snapshot["domains_covered"][SLOTargetDomain.GATEWAY.value] == 1


def test_telemetry_processor_cross_domain_propagation() -> None:
    engine = TelemetryEngine()
    req_id = "req-cross-domain-77"

    domains = [
        SLOTargetDomain.GATEWAY,
        SLOTargetDomain.STREAMING,
        SLOTargetDomain.RETRIEVAL,
        SLOTargetDomain.INGESTION,
        SLOTargetDomain.ACTIONS,
    ]

    for dom in domains:
        engine.record_span(
            request_id=req_id,
            domain=dom,
            service_name=f"service-{dom.value}",
            operation_name=f"op_{dom.value}",
            attributes={"client_secret": "my-client-secret-999"},
            duration_ms=15.0,
        )

    correlated = engine.get_spans_by_request_id(req_id)
    assert len(correlated) == 5
    for span in correlated:
        assert span.request_id == req_id
        assert span.attributes["client_secret"] == "[REDACTED_SECRET]"

    covered = engine.get_covered_domains()
    assert set(covered) == {d.value for d in domains}


def test_slo_monitoring_engine_tracks_five_domains_and_fires_alerts() -> None:
    slo_engine = SLOMonitoringEngine()

    # Default SLO definitions for gateway, streaming, retrieval, ingestion, actions
    dashboards = slo_engine.get_dashboards()
    assert len(dashboards) == 5
    domain_names = {d.domain for d in dashboards}
    assert domain_names == {
        SLOTargetDomain.GATEWAY.value,
        SLOTargetDomain.STREAMING.value,
        SLOTargetDomain.RETRIEVAL.value,
        SLOTargetDomain.INGESTION.value,
        SLOTargetDomain.ACTIONS.value,
    }

    # Record normal metrics (SLO healthy)
    slo_engine.record_metric(SLOTargetDomain.GATEWAY, latency_ms=120.0, success=True)
    slo_engine.record_metric(SLOTargetDomain.STREAMING, ttft_ms=180.0, success=True)
    slo_engine.record_metric(SLOTargetDomain.RETRIEVAL, latency_ms=210.0, success=True)
    slo_engine.record_metric(SLOTargetDomain.INGESTION, processing_time_sec=2.5, success=True)
    slo_engine.record_metric(SLOTargetDomain.ACTIONS, latency_ms=150.0, success=True)

    alerts = slo_engine.evaluate_slos()
    assert len(alerts) == 0

    # Violate Gateway Latency SLO (p95 threshold = 300ms)
    for _ in range(20):
        slo_engine.record_metric(SLOTargetDomain.GATEWAY, latency_ms=450.0, success=True)

    # Violate Retrieval Error Rate SLO (error threshold = 1%)
    for _ in range(5):
        slo_engine.record_metric(SLOTargetDomain.RETRIEVAL, latency_ms=200.0, success=False)

    active_alerts = slo_engine.evaluate_slos()
    assert len(active_alerts) >= 2

    gateway_alert = next(a for a in active_alerts if a.domain == SLOTargetDomain.GATEWAY.value)
    assert gateway_alert.owner == "SRE / Gateway Team"
    assert gateway_alert.severity == AlertSeverity.P0.value
    assert "Gateway Latency p95" in gateway_alert.impact
    assert gateway_alert.runbook_url != ""

    retrieval_alert = next(a for a in active_alerts if a.domain == SLOTargetDomain.RETRIEVAL.value)
    assert retrieval_alert.owner == "Knowledge & Retrieval Team"
    assert retrieval_alert.severity in [AlertSeverity.P0.value, AlertSeverity.P1.value]


def test_incident_response_manager_opens_incident_executes_containment_and_rca() -> None:
    manager = IncidentResponseManager()

    # Open incident with required fields
    incident = manager.open_incident(
        title="Violacao critica de SLO no Action Gateway",
        description="Taxa de erro de invocacoes MCP excedeu 15% com suspeita de exfiltracao.",
        severity=AlertSeverity.P0,
        affected_domains=[SLOTargetDomain.ACTIONS.value, SLOTargetDomain.GATEWAY.value],
        requested_containment=[
            ContainmentActionType.CIRCUIT_BREAKER_TRIP,
            ContainmentActionType.WORKSPACE_ISOLATION,
            ContainmentActionType.SECRET_FREEZE,
        ],
        opened_by="sre-oncall-operator",
    )

    assert incident.incident_id.startswith("INC-")
    assert incident.status == IncidentStatus.CONTAINED.value
    assert len(incident.containment_actions) == 3

    # Verify containment actions executed
    containment_types = {c["action_type"] for c in incident.containment_actions}
    assert containment_types == {
        ContainmentActionType.CIRCUIT_BREAKER_TRIP.value,
        ContainmentActionType.WORKSPACE_ISOLATION.value,
        ContainmentActionType.SECRET_FREEZE.value,
    }
    for c in incident.containment_actions:
        assert c["status"] == "EXECUTED"

    # Verify communications dispatched & audit timeline entries
    assert len(incident.timeline) >= 3
    event_types = [e["event_type"] for e in incident.timeline]
    assert "INCIDENT_OPENED" in event_types
    assert "CONTAINMENT_EXECUTED" in event_types
    assert "COMMUNICATION_DISPATCHED" in event_types

    # RCA template generated
    rca = manager.generate_rca_report(incident.incident_id)
    assert rca["incident_id"] == incident.incident_id
    assert "timeline" in rca
    assert "root_cause_analysis" in rca
    assert "preventive_actions" in rca

    # Resolve incident
    resolved = manager.resolve_incident(
        incident_id=incident.incident_id,
        resolution_notes="Circuit breaker reestabelecido apos revocacao de chave MCP afetada.",
        resolved_by="sre-oncall-operator",
    )
    assert resolved.status == IncidentStatus.RESOLVED.value


def test_incident_simulation_drill_runs_safely() -> None:
    manager = IncidentResponseManager()
    drill_result = manager.run_incident_drill(
        target_domain=SLOTargetDomain.RETRIEVAL,
        simulated_fault="QDRANT_HIGH_LATENCY_SLO_BREACH",
    )

    assert drill_result["drill_id"].startswith("DRILL-")
    assert drill_result["status"] == "SUCCESS"
    assert drill_result["containment_verified"] is True
    assert len(drill_result["audit_trail"]) > 0


def test_observability_fastapi_endpoints() -> None:
    app = create_app()
    client = TestClient(app)

    # 1. Telemetry endpoint
    resp = client.get("/api/v1/observability/telemetry/snapshot")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_spans" in data
    assert "redacted_fields_count" in data

    # 2. SLOs endpoint
    resp = client.get("/api/v1/observability/slos")
    assert resp.status_code == 200
    dashboards = resp.json()
    assert len(dashboards) == 5

    # 3. Alerts endpoint
    resp = client.get("/api/v1/observability/alerts")
    assert resp.status_code == 200
    alerts = resp.json()
    assert isinstance(alerts, list)

    # 4. Open Incident endpoint
    resp = client.post(
        "/api/v1/observability/incidents",
        json={
            "title": "Incidente Teste API",
            "description": "Latencia de retrieval alta em teste de integracao API",
            "severity": "P0",
            "affected_domains": ["retrieval"],
            "requested_containment": ["BACKPRESSURE_SHEDDING"],
            "opened_by": "api-test-runner",
        },
    )
    assert resp.status_code == 201
    inc_data = resp.json()
    assert inc_data["incident_id"].startswith("INC-")
    assert inc_data["status"] == "CONTAINED"

    # 5. Get Incident by ID
    inc_id = inc_data["incident_id"]
    resp = client.get(f"/api/v1/observability/incidents/{inc_id}")
    assert resp.status_code == 200
    fetch_data = resp.json()
    assert fetch_data["incident_id"] == inc_id

    # 6. Run Incident Drill endpoint
    resp = client.post(
        "/api/v1/observability/incidents/drill",
        json={
            "target_domain": "ingestao",
            "simulated_fault": "SIMULATED_MINIO_INGESTION_TIMEOUT",
        },
    )
    assert resp.status_code == 200
    drill_data = resp.json()
    assert drill_data["status"] == "SUCCESS"
