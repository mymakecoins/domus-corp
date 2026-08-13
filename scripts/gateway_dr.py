#!/usr/bin/env python3
"""
CLI entrypoint for DomusCorp Gateway HA, Failover & Disaster Recovery (V1-902).
Automates probe monitoring, failover validation, fail-closed security auditing, and DR recovery with non-bypass checks.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add apps/knowledge-api/src to python path
ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_SRC = ROOT / "apps" / "knowledge-api" / "src"
if str(KNOWLEDGE_SRC) not in sys.path:
    sys.path.insert(0, str(KNOWLEDGE_SRC))

from domus_knowledge.gateway_ha_dr import (
    GatewayHAProbeChecker,
    GatewayFailClosedSimulator,
    GatewayRecoveryManager,
    GatewayRecoveryConfig,
    NonBypassValidationError,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="DomusCorp Gateway HA, Failover & Disaster Recovery Tool"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Probes command
    cmd_probes = subparsers.add_parser("probes", help="Check gateway liveness & readiness probes")
    cmd_probes.add_argument("--primary-node", default="gateway-node-alpha", help="Primary node ID")
    cmd_probes.add_argument("--secondary-node", default="gateway-node-beta", help="Secondary node ID")

    # Failover command
    cmd_failover = subparsers.add_parser("failover", help="Execute stateless node failover check")
    cmd_failover.add_argument("--failed-node", default="gateway-node-alpha", help="Failed node ID")
    cmd_failover.add_argument("--target-node", default="gateway-node-beta", help="Target healthy node ID")
    cmd_failover.add_argument("--request-id", default="req-dr-correlation-001", help="Correlation request_id")

    # Audit fail-closed command
    subparsers.add_parser("audit-fail-closed", help="Audit fail-closed behavior under dependency outage")

    # Recover command
    cmd_recover = subparsers.add_parser("recover", help="Execute gateway disaster recovery with non-bypass check")
    cmd_recover.add_argument("--incident-id", required=True, help="Incident ID")
    cmd_recover.add_argument("--target-node", default="gateway-node-beta", help="Target node for traffic restoration")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    config = GatewayRecoveryConfig(
        primary_node_id=getattr(args, "primary_node", "gateway-node-alpha"),
        secondary_node_id=getattr(args, "secondary_node", "gateway-node-beta"),
    )

    if args.command == "probes":
        checker = GatewayHAProbeChecker(config)
        liveness = checker.check_liveness()
        readiness = checker.check_readiness()

        print(f"Liveness: {liveness['status']} (Node: {liveness['node_id']})")
        print(f"Readiness: {readiness['status']} (Ready: {readiness['ready']})")
        print("Dependencies:", readiness['dependencies'])
        return 0 if readiness['ready'] else 1

    elif args.command == "failover":
        checker = GatewayHAProbeChecker(config)
        event = checker.simulate_node_failover(
            failed_node=args.failed_node,
            target_node=args.target_node,
            request_id=args.request_id,
        )
        print(f"SUCCESS: Failover from {event['failed_node']} to {event['active_node']} executed.")
        print(f"Correlation ID ({event['request_id']}) and secrets preserved.")
        return 0

    elif args.command == "audit-fail-closed":
        simulator = GatewayFailClosedSimulator()
        deps = ["vault", "policy", "budget", "authorization"]
        all_passed = True

        for dep in deps:
            simulator.reset_outages()
            simulator.trigger_outage(dep)
            res = simulator.evaluate_request("execute_model", {"tenant_id": "audit-t1"})
            if not res["allowed"] and res["code"] == "GATEWAY_DEPENDENCY_UNAVAILABLE":
                print(f"✔ Dependency outage [{dep.upper()}]: Fail-closed ENFORCED safely.")
            else:
                print(f"✖ Dependency outage [{dep.upper()}]: Fail-closed FAILED!")
                all_passed = False

        return 0 if all_passed else 1

    elif args.command == "recover":
        recovery_mgr = GatewayRecoveryManager(config)
        try:
            result = recovery_mgr.execute_recovery(args.incident_id, args.target_node)
            print(f"SUCCESS: Gateway DR recovery for {args.incident_id} completed.")
            print(f"RTO: {result['rto_seconds']}s (SLA Met: {result['rto_sla_met']})")
            print(f"RPO: {result['rpo_seconds']}s (SLA Met: {result['rpo_sla_met']})")
            print("Non-bypass security validation: PASSED")
            return 0
        except NonBypassValidationError as e:
            print(f"CRITICAL ERROR: Gateway DR recovery blocked by non-bypass security check: {e}")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
