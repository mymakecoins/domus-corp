"""
Unit and integration tests for V1-904: Controlled pilot plan, support runbook, adoption telemetry, cost/task, groundedness, block rate, kill-switch matrix, and Gate G8 executive decision.
Follows TDD rules: write failing tests first, verify RED, implement minimal code, verify GREEN.
"""

from datetime import datetime, timezone
import pytest

from domus_knowledge.pilot_rollout import (
    DecisionStatus,
    GateG8Report,
    KillSwitchAction,
    KillSwitchLogEntry,
    PilotGroupConfig,
    PilotOwnerConfig,
    PilotPlanConfig,
    PilotRolloutManager,
    RingLevel,
    TaskTelemetryPayload,
    TelemetrySummary,
)


@pytest.fixture
def sample_owners():
    return PilotOwnerConfig(
        workspace_owner="alice@domuscorp.com",
        business_owner="bob@domuscorp.com",
        sre_owner="sre-team@domuscorp.com",
        cs_owner="cs-lead@domuscorp.com",
    )


@pytest.fixture
def sample_groups(sample_owners):
    return [
        PilotGroupConfig(
            group_id="group-ring0-canary",
            name="Ring 0 - Canary Internal",
            ring_level=RingLevel.RING_0_CANARY.value,
            workspaces=["ws-internal-qa", "ws-sre-ops"],
            data_sources=["mcp_notion", "mcp_jira"],
            owners=sample_owners,
            support_channel="#domus-pilot-internal",
            entry_criteria=["Security audit completed", "Gate G7 approved"],
            exit_criteria=["0 P0 incidents for 7 days", "Groundedness > 0.85"],
            is_active=True,
            max_users=10,
        ),
        PilotGroupConfig(
            group_id="group-ring1-early",
            name="Ring 1 - Early Adopters Pilot",
            ring_level=RingLevel.RING_1_PILOT.value,
            workspaces=["ws-finance-core", "ws-hr-policies"],
            data_sources=["mcp_notion", "mcp_jira", "sharepoint_docs"],
            owners=sample_owners,
            support_channel="#domus-pilot-early",
            entry_criteria=["Ring 0 passed", "User training completed"],
            exit_criteria=["CSAT > 4.0", "Block rate < 5%"],
            is_active=True,
            max_users=50,
        ),
    ]


@pytest.fixture
def sample_plan(sample_groups):
    return PilotPlanConfig(
        plan_id="plan-v1-904-pilot",
        title="DomusCorp V1.0 Controlled Pilot Plan",
        groups=sample_groups,
        duration_days=14,
        training_url="https://docs.domuscorp.com/training/pilot-v1",
        runbook_url="https://docs.domuscorp.com/runbooks/support-v1",
        start_time=datetime.now(timezone.utc),
    )


def test_pilot_plan_initialization_and_group_management(sample_plan):
    mgr = PilotRolloutManager(sample_plan)
    plan = mgr.get_plan()

    assert plan.plan_id == "plan-v1-904-pilot"
    assert len(plan.groups) == 2
    assert mgr.is_group_active("group-ring0-canary") is True
    assert mgr.is_connector_enabled("group-ring0-canary", "mcp_notion") is True
    assert mgr.is_connector_enabled("group-ring0-canary", "unknown_connector") is False


def test_telemetry_recording_and_aggregation(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    # Record tasks
    mgr.record_telemetry(
        TaskTelemetryPayload(
            task_id="task-001",
            plan_id="plan-v1-904-pilot",
            group_id="group-ring0-canary",
            workspace_id="ws-internal-qa",
            user_id="user-1",
            cost=0.04,
            groundedness_score=0.92,
            citation_fidelity=0.95,
            latency_ms=450.0,
            is_blocked=False,
            has_incident=False,
            knowledge_gap_reported=False,
            user_feedback_score=5.0,
            risk_comprehension_score=4.5,
        )
    )

    mgr.record_telemetry(
        TaskTelemetryPayload(
            task_id="task-002",
            plan_id="plan-v1-904-pilot",
            group_id="group-ring0-canary",
            workspace_id="ws-internal-qa",
            user_id="user-2",
            cost=0.08,
            groundedness_score=0.88,
            citation_fidelity=0.90,
            latency_ms=650.0,
            is_blocked=True,
            block_reason="Security policy threshold match",
            has_incident=False,
            knowledge_gap_reported=True,
            user_feedback_score=4.0,
            risk_comprehension_score=4.0,
        )
    )

    summary = mgr.get_telemetry_summary()

    assert summary.total_tasks == 2
    assert summary.active_workspaces == 1
    assert summary.active_users == 2
    assert summary.total_cost == pytest.approx(0.12)
    assert summary.avg_cost_per_task == pytest.approx(0.06)
    assert summary.avg_groundedness == pytest.approx(0.90)
    assert summary.block_rate == pytest.approx(0.50)  # 1 out of 2 tasks blocked
    assert summary.total_knowledge_gaps == 1
    assert summary.p95_latency_ms >= 650.0


def test_kill_switch_disconnect_connector(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    # Initial state
    assert mgr.is_connector_enabled("group-ring1-early", "sharepoint_docs") is True

    # Trigger DISCONNECT_CONNECTOR
    entry = mgr.trigger_kill_switch(
        action=KillSwitchAction.DISCONNECT_CONNECTOR,
        operator="sre-oncall@domuscorp.com",
        reason="Security vulnerability detected in sharepoint connector",
        group_id="group-ring1-early",
        connector="sharepoint_docs",
    )

    assert entry.action == KillSwitchAction.DISCONNECT_CONNECTOR
    assert entry.audit_preserved is True
    assert entry.evidence_id.startswith("EV-KS-")

    # Verify connector disabled only for targeted group
    assert mgr.is_connector_enabled("group-ring1-early", "sharepoint_docs") is False
    assert mgr.is_connector_enabled("group-ring1-early", "mcp_notion") is True


def test_kill_switch_revert_policy_and_reduce_ring(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    # Revert Policy
    entry_pol = mgr.trigger_kill_switch(
        action=KillSwitchAction.REVERT_POLICY,
        operator="security-lead@domuscorp.com",
        reason="Prompt injection spike observed in early adopters",
        group_id="group-ring1-early",
    )
    assert entry_pol.action == KillSwitchAction.REVERT_POLICY
    assert mgr.get_policy_state("group-ring1-early") == "STRICT_FALLBACK"

    # Reduce Ring (deactivates ring 1)
    entry_ring = mgr.trigger_kill_switch(
        action=KillSwitchAction.REDUCE_RING,
        operator="product-owner@domuscorp.com",
        reason="Scaling issues in Ring 1, falling back to Ring 0",
        group_id="group-ring1-early",
    )
    assert entry_ring.action == KillSwitchAction.REDUCE_RING
    assert mgr.is_group_active("group-ring1-early") is False
    assert mgr.is_group_active("group-ring0-canary") is True


def test_kill_switch_emergency_rollback(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    entry_rollback = mgr.trigger_kill_switch(
        action=KillSwitchAction.EMERGENCY_ROLLBACK,
        operator="cto@domuscorp.com",
        reason="Global emergency rollback required",
    )

    assert entry_rollback.action == KillSwitchAction.EMERGENCY_ROLLBACK
    assert mgr.is_group_active("group-ring0-canary") is False
    assert mgr.is_group_active("group-ring1-early") is False
    assert entry_rollback.audit_preserved is True


def test_executive_gate_g8_evaluation_pass(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    # Populate successful pilot metrics (groundedness > 0.85, cost < $0.15, block rate < 5%, 0 P0 incidents)
    for i in range(20):
        mgr.record_telemetry(
            TaskTelemetryPayload(
                task_id=f"task-pass-{i}",
                plan_id="plan-v1-904-pilot",
                group_id="group-ring0-canary",
                workspace_id="ws-internal-qa",
                user_id=f"user-{i % 5}",
                cost=0.05,
                groundedness_score=0.92,
                citation_fidelity=0.94,
                latency_ms=400.0,
                is_blocked=False,
                has_incident=False,
                user_feedback_score=4.5,
                risk_comprehension_score=4.8,
            )
        )

    report = mgr.evaluate_gate_g8()

    assert isinstance(report, GateG8Report)
    assert report.decision == DecisionStatus.APPROVED_FOR_EXPANSION
    assert report.criteria_checklist["groundedness_target_met"] is True
    assert report.criteria_checklist["cost_per_task_within_budget"] is True
    assert report.criteria_checklist["block_rate_acceptable"] is True
    assert report.criteria_checklist["no_uncontained_p0_incidents"] is True
    assert len(report.backlog_v1_1_items) > 0


def test_executive_gate_g8_evaluation_fail_low_groundedness(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    # Low groundedness
    for i in range(10):
        mgr.record_telemetry(
            TaskTelemetryPayload(
                task_id=f"task-fail-{i}",
                plan_id="plan-v1-904-pilot",
                group_id="group-ring1-early",
                workspace_id="ws-finance-core",
                user_id=f"user-{i}",
                cost=0.05,
                groundedness_score=0.65,  # below 0.85 threshold
                citation_fidelity=0.70,
                latency_ms=500.0,
                is_blocked=False,
                has_incident=False,
            )
        )

    report = mgr.evaluate_gate_g8()
    assert report.decision == DecisionStatus.PAUSED_REMEDIATION_REQUIRED
    assert report.criteria_checklist["groundedness_target_met"] is False


def test_executive_gate_g8_evaluation_fail_uncontained_p0(sample_plan):
    mgr = PilotRolloutManager(sample_plan)

    mgr.record_telemetry(
        TaskTelemetryPayload(
            task_id="task-p0-inc",
            plan_id="plan-v1-904-pilot",
            group_id="group-ring0-canary",
            workspace_id="ws-internal-qa",
            user_id="user-p0",
            cost=0.05,
            groundedness_score=0.90,
            citation_fidelity=0.90,
            latency_ms=300.0,
            is_blocked=False,
            has_incident=True,
            incident_severity="P0",
        )
    )

    report = mgr.evaluate_gate_g8()
    assert report.decision == DecisionStatus.ROLLBACK_TRIGGERED
    assert report.criteria_checklist["no_uncontained_p0_incidents"] is False


def test_pilot_api_endpoints(sample_plan):
    from fastapi.testclient import TestClient
    from domus_knowledge.main import create_app

    app = create_app()
    client = TestClient(app)

    # 1. Create pilot plan
    plan_data = sample_plan.model_dump(mode="json")
    resp_plan = client.post("/api/v1/pilot/plans", json=plan_data)
    assert resp_plan.status_code == 201
    created_plan = resp_plan.json()
    assert created_plan["plan_id"] == "plan-v1-904-pilot"

    # 2. Get pilot plan
    resp_get_plan = client.get("/api/v1/pilot/plans/plan-v1-904-pilot")
    assert resp_get_plan.status_code == 200
    assert resp_get_plan.json()["title"] == "DomusCorp V1.0 Controlled Pilot Plan"

    # 3. Record telemetry
    telemetry_data = {
        "task_id": "task-api-001",
        "plan_id": "plan-v1-904-pilot",
        "group_id": "group-ring0-canary",
        "workspace_id": "ws-internal-qa",
        "user_id": "user-api-1",
        "cost": 0.05,
        "groundedness_score": 0.94,
        "citation_fidelity": 0.96,
        "latency_ms": 320.0,
        "is_blocked": False,
    }
    resp_tel = client.post("/api/v1/pilot/telemetry/record", json=telemetry_data)
    assert resp_tel.status_code == 201
    assert resp_tel.json()["recorded"] is True

    # 4. Get summary
    resp_summary = client.get("/api/v1/pilot/telemetry/summary")
    assert resp_summary.status_code == 200
    sum_json = resp_summary.json()
    assert sum_json["total_tasks"] == 1
    assert sum_json["avg_groundedness"] == pytest.approx(0.94)

    # 5. Trigger kill-switch
    ks_data = {
        "action": "DISCONNECT_CONNECTOR",
        "operator": "sre-lead@domuscorp.com",
        "reason": "Vulnerability mitigation",
        "group_id": "group-ring0-canary",
        "connector": "mcp_jira",
    }
    resp_ks = client.post("/api/v1/pilot/kill-switch/trigger", json=ks_data)
    assert resp_ks.status_code == 200
    assert resp_ks.json()["action"] == "DISCONNECT_CONNECTOR"
    assert resp_ks.json()["evidence_id"].startswith("EV-KS-")

    # 6. Evaluate Gate G8
    resp_g8 = client.get("/api/v1/pilot/gate-g8/evaluate")
    assert resp_g8.status_code == 200
    g8_json = resp_g8.json()
    assert g8_json["decision"] == "APPROVED_FOR_EXPANSION"

