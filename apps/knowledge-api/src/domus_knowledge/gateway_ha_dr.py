"""
Gateway High Availability, Safe Degradation and Disaster Recovery Module (V1-902).
Provides health probes, failover state preservation, fail-closed security simulation,
and disaster recovery management with non-bypass security validation and RTO/RPO SLA checks.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import time


class NonBypassValidationError(Exception):
    """Raised when security non-bypass validation fails prior to reopening traffic."""
    pass


@dataclass
class GatewayRecoveryConfig:
    target_rto_seconds: int = 900   # 15 minutes max
    target_rpo_seconds: int = 3600  # 1 hour max
    primary_node_id: str = "gateway-node-alpha"
    secondary_node_id: str = "gateway-node-beta"
    vault_endpoint: str = "http://localhost:8200"
    policy_endpoint: str = "http://localhost:3000/v1/policy"
    budget_endpoint: str = "http://localhost:3000/v1/budget"
    auth_endpoint: str = "http://localhost:3000/v1/auth"
    alert_owner: str = "sre-team@domuscorp.com"


class GatewayHAProbeChecker:
    """Manages liveness and readiness probe checks for gateway dependencies."""

    def __init__(self, config: GatewayRecoveryConfig) -> None:
        self.config = config
        self._dependencies: Dict[str, str] = {
            "authorization": "ok",
            "policy": "ok",
            "budget": "ok",
            "vault": "ok",
        }
        self._active_node: str = config.primary_node_id

    def set_dependency_status(self, name: str, status: str) -> None:
        self._dependencies[name] = status

    def check_liveness(self) -> Dict[str, Any]:
        return {
            "service": "gateway",
            "status": "ok",
            "node_id": self._active_node,
        }

    def check_readiness(self) -> Dict[str, Any]:
        all_ok = all(v == "ok" for v in self._dependencies.values())
        if all_ok:
            return {
                "ready": True,
                "status": "ok",
                "dependencies": dict(self._dependencies),
            }
        return {
            "ready": False,
            "status": "degraded",
            "code": "GATEWAY_READINESS_FAILED",
            "dependencies": dict(self._dependencies),
        }

    def simulate_node_failover(
        self,
        failed_node: str,
        target_node: str,
        request_id: str,
    ) -> Dict[str, Any]:
        self._active_node = target_node
        return {
            "success": True,
            "failed_node": failed_node,
            "active_node": target_node,
            "request_id": request_id,
            "secrets_preserved": True,
            "policy_enforced": True,
        }


class GatewayFailClosedSimulator:
    """Simulates fail-closed enforcement when critical dependencies fail."""

    def __init__(self) -> None:
        self._outages: set[str] = set()

    def trigger_outage(self, dependency_name: str) -> None:
        self._outages.add(dependency_name)

    def reset_outages(self) -> None:
        self._outages.clear()

    def evaluate_request(
        self,
        action: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        if self._outages:
            # First active outage triggers fail-closed response
            active_dep = sorted(list(self._outages))[0]
            return {
                "allowed": False,
                "code": "GATEWAY_DEPENDENCY_UNAVAILABLE",
                "dependency": active_dep,
                "action": action,
                "reason": f"Fail-closed mode active due to {active_dep} loss",
            }
        return {
            "allowed": True,
            "action": action,
            "context": context,
        }


class GatewayRecoveryManager:
    """Orchestrates Gateway Disaster Recovery within RTO/RPO limits and enforces non-bypass validation."""

    def __init__(self, config: GatewayRecoveryConfig) -> None:
        self.config = config
        self._forced_non_bypass_failure: Optional[str] = None

    def force_non_bypass_failure(self, reason: str) -> None:
        self._forced_non_bypass_failure = reason

    def validate_non_bypass(self) -> bool:
        if self._forced_non_bypass_failure:
            raise NonBypassValidationError(
                f"Non-bypass security validation failed: {self._forced_non_bypass_failure}"
            )
        return True

    def execute_recovery(
        self,
        incident_id: str,
        target_node: str,
    ) -> Dict[str, Any]:
        start_time = time.time()

        # Step 1: Pre-flight security validation (must pass before reopening traffic)
        self.validate_non_bypass()

        # Step 2: Simulate DR recovery actions
        rto_measured = int(time.time() - start_time) + 120  # Simulated 120s recovery duration
        rpo_measured = 300  # Simulated 5 min state delta

        rto_met = rto_measured <= self.config.target_rto_seconds
        rpo_met = rpo_measured <= self.config.target_rpo_seconds

        return {
            "success": True,
            "incident_id": incident_id,
            "target_node": target_node,
            "rto_seconds": rto_measured,
            "rpo_seconds": rpo_measured,
            "rto_sla_met": rto_met,
            "rpo_sla_met": rpo_met,
            "non_bypass_validated": True,
            "status": "RECOVERED_AND_VERIFIED",
        }
