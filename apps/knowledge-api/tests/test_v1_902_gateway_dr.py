"""
Unit and integration tests for V1-902: High availability, safe degradation, fail-closed enforcement and gateway recovery.
Follows TDD rules: tests probes, failover state preservation, fail-closed behavior on dependency loss, and DR RTO/RPO recovery with non-bypass validation.
"""

import pytest
from domus_knowledge.gateway_ha_dr import (
    GatewayHAProbeChecker,
    GatewayFailClosedSimulator,
    GatewayRecoveryManager,
    GatewayRecoveryConfig,
    NonBypassValidationError,
)


@pytest.fixture
def dr_config():
    return GatewayRecoveryConfig(
        target_rto_seconds=900,   # 15 minutes
        target_rpo_seconds=3600,  # 1 hour
        primary_node_id="gateway-node-alpha",
        secondary_node_id="gateway-node-beta",
        vault_endpoint="http://localhost:8200",
        policy_endpoint="http://localhost:3000/v1/policy",
        budget_endpoint="http://localhost:3000/v1/budget",
        auth_endpoint="http://localhost:3000/v1/auth",
        alert_owner="sre-team@domuscorp.com",
    )


def test_gateway_ha_probe_checker_all_healthy(dr_config):
    checker = GatewayHAProbeChecker(dr_config)
    status = checker.check_readiness()

    assert status["ready"] is True
    assert status["status"] == "ok"
    assert status["dependencies"]["authorization"] == "ok"
    assert status["dependencies"]["policy"] == "ok"
    assert status["dependencies"]["budget"] == "ok"
    assert status["dependencies"]["vault"] == "ok"


def test_gateway_ha_probe_checker_degraded_when_dependency_fails(dr_config):
    checker = GatewayHAProbeChecker(dr_config)
    checker.set_dependency_status("vault", "down")
    status = checker.check_readiness()

    assert status["ready"] is False
    assert status["status"] == "degraded"
    assert status["code"] == "GATEWAY_READINESS_FAILED"
    assert status["dependencies"]["vault"] == "down"


def test_failover_preserves_request_correlation_and_secrets(dr_config):
    checker = GatewayHAProbeChecker(dr_config)
    
    # Active node failover simulation
    failover_event = checker.simulate_node_failover(
        failed_node="gateway-node-alpha",
        target_node="gateway-node-beta",
        request_id="req-corr-9902-abc",
    )

    assert failover_event["success"] is True
    assert failover_event["active_node"] == "gateway-node-beta"
    assert failover_event["request_id"] == "req-corr-9902-abc"
    assert failover_event["secrets_preserved"] is True
    assert failover_event["policy_enforced"] is True


def test_fail_closed_simulator_blocks_all_operations_on_dependency_loss():
    simulator = GatewayFailClosedSimulator()

    # 1. Normal state -> operation allowed
    normal_res = simulator.evaluate_request(
        action="execute_model",
        context={"tenant_id": "t1", "user_id": "u1"},
    )
    assert normal_res["allowed"] is True

    # 2. Vault loss -> Fail-closed
    simulator.trigger_outage("vault")
    vault_res = simulator.evaluate_request("execute_model", {"tenant_id": "t1"})
    assert vault_res["allowed"] is False
    assert vault_res["code"] == "GATEWAY_DEPENDENCY_UNAVAILABLE"
    assert vault_res["dependency"] == "vault"

    # 3. Policy loss -> Fail-closed
    simulator.reset_outages()
    simulator.trigger_outage("policy")
    policy_res = simulator.evaluate_request("retrieve_knowledge", {"tenant_id": "t1"})
    assert policy_res["allowed"] is False
    assert policy_res["code"] == "GATEWAY_DEPENDENCY_UNAVAILABLE"

    # 4. Budget loss -> Fail-closed
    simulator.reset_outages()
    simulator.trigger_outage("budget")
    budget_res = simulator.evaluate_request("execute_mcp_tool", {"tenant_id": "t1"})
    assert budget_res["allowed"] is False
    assert budget_res["code"] == "GATEWAY_DEPENDENCY_UNAVAILABLE"

    # 5. Auth loss -> Fail-closed
    simulator.reset_outages()
    simulator.trigger_outage("authorization")
    auth_res = simulator.evaluate_request("execute_model", {"tenant_id": "t1"})
    assert auth_res["allowed"] is False
    assert auth_res["code"] == "GATEWAY_DEPENDENCY_UNAVAILABLE"


def test_gateway_recovery_manager_executes_dr_within_rto_rpo(dr_config):
    recovery_mgr = GatewayRecoveryManager(dr_config)

    recovery_result = recovery_mgr.execute_recovery(
        incident_id="INC-GW-DISASTER-01",
        target_node="gateway-node-beta",
    )

    assert recovery_result["success"] is True
    assert recovery_result["incident_id"] == "INC-GW-DISASTER-01"
    assert recovery_result["rto_seconds"] <= dr_config.target_rto_seconds
    assert recovery_result["rpo_seconds"] <= dr_config.target_rpo_seconds
    assert recovery_result["rto_sla_met"] is True
    assert recovery_result["rpo_sla_met"] is True
    assert recovery_result["non_bypass_validated"] is True


def test_gateway_recovery_fails_if_non_bypass_validation_fails(dr_config):
    recovery_mgr = GatewayRecoveryManager(dr_config)

    # Force non-bypass security check to fail (e.g., unpolicied route detected)
    recovery_mgr.force_non_bypass_failure("Unpolicied route detected during DR dry-run")

    with pytest.raises(NonBypassValidationError) as exc_info:
        recovery_mgr.execute_recovery("INC-GW-DISASTER-02", "gateway-node-beta")

    assert "Non-bypass security validation failed" in str(exc_info.value)
    assert "Unpolicied route detected" in str(exc_info.value)
