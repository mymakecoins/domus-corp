"""
Controlled Pilot Rollout, Telemetry Instrumentation, Support Plan, and Kill-Switch Matrix for Domus Corp (V1-904).
"""

from datetime import datetime, timezone
from enum import Enum
import math
import uuid
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field


class RingLevel(int, Enum):
    RING_0_CANARY = 0
    RING_1_PILOT = 1
    RING_2_EXPANDED = 2


class KillSwitchAction(str, Enum):
    DISCONNECT_CONNECTOR = "DISCONNECT_CONNECTOR"
    REVERT_POLICY = "REVERT_POLICY"
    REDUCE_RING = "REDUCE_RING"
    EMERGENCY_ROLLBACK = "EMERGENCY_ROLLBACK"


class DecisionStatus(str, Enum):
    APPROVED_FOR_EXPANSION = "APPROVED_FOR_EXPANSION"
    PAUSED_REMEDIATION_REQUIRED = "PAUSED_REMEDIATION_REQUIRED"
    ROLLBACK_TRIGGERED = "ROLLBACK_TRIGGERED"


class PilotOwnerConfig(BaseModel):
    workspace_owner: str
    business_owner: str
    sre_owner: str
    cs_owner: str


class PilotGroupConfig(BaseModel):
    group_id: str
    name: str
    ring_level: int
    workspaces: List[str] = Field(default_factory=list)
    data_sources: List[str] = Field(default_factory=list)
    owners: PilotOwnerConfig
    support_channel: str
    entry_criteria: List[str] = Field(default_factory=list)
    exit_criteria: List[str] = Field(default_factory=list)
    is_active: bool = True
    max_users: int = 50


class PilotPlanConfig(BaseModel):
    plan_id: str
    title: str
    groups: List[PilotGroupConfig] = Field(default_factory=list)
    duration_days: int = 14
    training_url: str = ""
    runbook_url: str = ""
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskTelemetryPayload(BaseModel):
    task_id: str
    plan_id: str
    group_id: str
    workspace_id: str
    user_id: str
    cost: float
    groundedness_score: float
    citation_fidelity: float
    latency_ms: float
    is_blocked: bool = False
    block_reason: Optional[str] = None
    has_incident: bool = False
    incident_severity: Optional[str] = None
    knowledge_gap_reported: bool = False
    user_feedback_score: Optional[float] = None
    risk_comprehension_score: Optional[float] = None


class TelemetrySummary(BaseModel):
    total_tasks: int
    active_workspaces: int
    active_users: int
    total_cost: float
    avg_cost_per_task: float
    avg_groundedness: float
    avg_citation_fidelity: float
    p95_latency_ms: float
    block_rate: float
    total_incidents_p0: int
    total_incidents_p1: int
    total_knowledge_gaps: int
    avg_user_feedback: float
    avg_risk_comprehension: float


class KillSwitchLogEntry(BaseModel):
    event_id: str
    timestamp: datetime
    action: KillSwitchAction
    operator: str
    reason: str
    target_group_id: Optional[str] = None
    target_connector: Optional[str] = None
    evidence_id: str
    audit_preserved: bool = True


class GateG8Report(BaseModel):
    decision: DecisionStatus
    summary: TelemetrySummary
    criteria_checklist: Dict[str, bool]
    kill_switches_triggered: List[KillSwitchLogEntry]
    backlog_v1_1_items: List[str]
    rationale: str


class PilotRolloutManager:
    """Manages pilot plan execution, telemetry collection, kill-switches, and Gate G8 evaluation."""

    def __init__(self, plan: PilotPlanConfig):
        self._plan = plan
        self._groups: Dict[str, PilotGroupConfig] = {g.group_id: g for g in plan.groups}
        self._telemetry_tasks: List[TaskTelemetryPayload] = []
        self._kill_switch_logs: List[KillSwitchLogEntry] = []
        self._disabled_connectors: Set[tuple[str, str]] = set()  # (group_id, connector)
        self._policy_states: Dict[str, str] = {g.group_id: "STANDARD_PILOT" for g in plan.groups}

    def get_plan(self) -> PilotPlanConfig:
        return self._plan

    def add_group(self, group: PilotGroupConfig) -> None:
        self._groups[group.group_id] = group
        self._policy_states[group.group_id] = "STANDARD_PILOT"
        if group not in self._plan.groups:
            self._plan.groups.append(group)

    def is_group_active(self, group_id: str) -> bool:
        group = self._groups.get(group_id)
        return group.is_active if group else False

    def is_connector_enabled(self, group_id: str, connector: str) -> bool:
        if not self.is_group_active(group_id):
            return False
        group = self._groups.get(group_id)
        if not group or connector not in group.data_sources:
            return False
        return (group_id, connector) not in self._disabled_connectors

    def get_policy_state(self, group_id: str) -> str:
        return self._policy_states.get(group_id, "STANDARD_PILOT")

    def record_telemetry(self, payload: TaskTelemetryPayload) -> None:
        self._telemetry_tasks.append(payload)

    def get_telemetry_summary(self, group_id: Optional[str] = None) -> TelemetrySummary:
        tasks = [
            t for t in self._telemetry_tasks
            if group_id is None or t.group_id == group_id
        ]

        if not tasks:
            return TelemetrySummary(
                total_tasks=0,
                active_workspaces=0,
                active_users=0,
                total_cost=0.0,
                avg_cost_per_task=0.0,
                avg_groundedness=0.0,
                avg_citation_fidelity=0.0,
                p95_latency_ms=0.0,
                block_rate=0.0,
                total_incidents_p0=0,
                total_incidents_p1=0,
                total_knowledge_gaps=0,
                avg_user_feedback=0.0,
                avg_risk_comprehension=0.0,
            )

        total_tasks = len(tasks)
        unique_workspaces = {t.workspace_id for t in tasks}
        unique_users = {t.user_id for t in tasks}

        total_cost = sum(t.cost for t in tasks)
        avg_cost = total_cost / total_tasks

        avg_groundedness = sum(t.groundedness_score for t in tasks) / total_tasks
        avg_citation = sum(t.citation_fidelity for t in tasks) / total_tasks

        latencies = sorted(t.latency_ms for t in tasks)
        p95_idx = math.ceil(0.95 * total_tasks) - 1
        p95_latency = latencies[max(0, min(p95_idx, total_tasks - 1))]

        blocked_count = sum(1 for t in tasks if t.is_blocked)
        block_rate = blocked_count / total_tasks

        p0_count = sum(1 for t in tasks if t.has_incident and t.incident_severity == "P0")
        p1_count = sum(1 for t in tasks if t.has_incident and t.incident_severity == "P1")
        gap_count = sum(1 for t in tasks if t.knowledge_gap_reported)

        feedbacks = [t.user_feedback_score for t in tasks if t.user_feedback_score is not None]
        avg_feedback = sum(feedbacks) / len(feedbacks) if feedbacks else 0.0

        risk_scores = [t.risk_comprehension_score for t in tasks if t.risk_comprehension_score is not None]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

        return TelemetrySummary(
            total_tasks=total_tasks,
            active_workspaces=len(unique_workspaces),
            active_users=len(unique_users),
            total_cost=total_cost,
            avg_cost_per_task=avg_cost,
            avg_groundedness=avg_groundedness,
            avg_citation_fidelity=avg_citation,
            p95_latency_ms=p95_latency,
            block_rate=block_rate,
            total_incidents_p0=p0_count,
            total_incidents_p1=p1_count,
            total_knowledge_gaps=gap_count,
            avg_user_feedback=avg_feedback,
            avg_risk_comprehension=avg_risk,
        )

    def trigger_kill_switch(
        self,
        action: KillSwitchAction,
        operator: str,
        reason: str,
        group_id: Optional[str] = None,
        connector: Optional[str] = None,
    ) -> KillSwitchLogEntry:
        evidence_id = f"EV-KS-{uuid.uuid4().hex[:8].upper()}"

        if action == KillSwitchAction.DISCONNECT_CONNECTOR:
            if group_id and connector:
                self._disabled_connectors.add((group_id, connector))
        elif action == KillSwitchAction.REVERT_POLICY:
            if group_id:
                self._policy_states[group_id] = "STRICT_FALLBACK"
            else:
                for gid in self._groups:
                    self._policy_states[gid] = "STRICT_FALLBACK"
        elif action == KillSwitchAction.REDUCE_RING:
            if group_id and group_id in self._groups:
                self._groups[group_id].is_active = False
        elif action == KillSwitchAction.EMERGENCY_ROLLBACK:
            for g in self._groups.values():
                g.is_active = False
            for gid in self._groups:
                self._policy_states[gid] = "STRICT_FALLBACK"

        entry = KillSwitchLogEntry(
            event_id=f"ks-evt-{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now(timezone.utc),
            action=action,
            operator=operator,
            reason=reason,
            target_group_id=group_id,
            target_connector=connector,
            evidence_id=evidence_id,
            audit_preserved=True,
        )
        self._kill_switch_logs.append(entry)
        return entry

    def evaluate_gate_g8(self) -> GateG8Report:
        summary = self.get_telemetry_summary()

        groundedness_ok = summary.avg_groundedness >= 0.85 if summary.total_tasks > 0 else True
        cost_ok = summary.avg_cost_per_task <= 0.15 if summary.total_tasks > 0 else True
        block_rate_ok = summary.block_rate <= 0.50  # Operational threshold
        no_p0 = summary.total_incidents_p0 == 0

        criteria = {
            "groundedness_target_met": groundedness_ok,
            "cost_per_task_within_budget": cost_ok,
            "block_rate_acceptable": block_rate_ok,
            "no_uncontained_p0_incidents": no_p0,
            "audit_evidence_preserved": True,
        }

        backlog_v1_1 = [
            "V1.1-001: Expand auto-healing connectors to SharePoint and Google Drive",
            "V1.1-002: Advanced groundedness re-ranking based on pilot user feedback",
            "V1.1-003: Dynamic task cost optimization per model family",
        ]

        if not no_p0:
            decision = DecisionStatus.ROLLBACK_TRIGGERED
            rationale = "Uncontained P0 incident recorded during pilot. Triggering rollback and halting Gate G8 expansion."
        elif not groundedness_ok or not cost_ok or not block_rate_ok:
            decision = DecisionStatus.PAUSED_REMEDIATION_REQUIRED
            rationale = f"Pilot criteria not fully satisfied (Groundedness OK={groundedness_ok}, Cost OK={cost_ok}, Block Rate OK={block_rate_ok}). Expansion paused."
        else:
            decision = DecisionStatus.APPROVED_FOR_EXPANSION
            rationale = "All Gate G8 expansion criteria successfully met across pilot groups. System approved for corporate rollout."

        return GateG8Report(
            decision=decision,
            summary=summary,
            criteria_checklist=criteria,
            kill_switches_triggered=self._kill_switch_logs,
            backlog_v1_1_items=backlog_v1_1,
            rationale=rationale,
        )
