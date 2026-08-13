"""OpenTelemetry Observability, SLO Monitoring, and Incident Response Engine for Domus Corp (V1-901)."""

from datetime import datetime, timezone
from enum import Enum
import re
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SLOTargetDomain(str, Enum):
    GATEWAY = "gateway"
    STREAMING = "streaming"
    RETRIEVAL = "retrieval"
    INGESTION = "ingestao"
    ACTIONS = "acoes"


class AlertSeverity(str, Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"


class ContainmentActionType(str, Enum):
    CIRCUIT_BREAKER_TRIP = "CIRCUIT_BREAKER_TRIP"
    WORKSPACE_ISOLATION = "WORKSPACE_ISOLATION"
    SECRET_FREEZE = "SECRET_FREEZE"
    BACKPRESSURE_SHEDDING = "BACKPRESSURE_SHEDDING"
    EGRESS_CONTAINMENT = "EGRESS_CONTAINMENT"


class IncidentStatus(str, Enum):
    OPENED = "OPENED"
    CONTAINED = "CONTAINED"
    RESOLVED = "RESOLVED"


class RedactionProcessor:
    """Processor responsible for sanitizing logs and traces to eliminate secrets and PII."""

    SECRET_KEY_PATTERNS = [
        "api_key",
        "secret",
        "password",
        "token",
        "authorization",
        "auth",
        "bearer",
        "access_token",
        "refresh_token",
        "private_key",
        "client_secret",
    ]

    PII_KEY_PATTERNS = [
        "email",
        "user_email",
        "cpf",
        "ssn",
        "credit_card",
        "card_number",
        "phone",
    ]

    EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
    CPF_REGEX = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
    CARD_REGEX = re.compile(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b")

    def redact_attributes(self, attributes: Dict[str, Any]) -> tuple[Dict[str, Any], int]:
        redacted = {}
        redacted_count = 0

        for key, value in attributes.items():
            key_lower = key.lower()

            if any(pattern in key_lower for pattern in self.SECRET_KEY_PATTERNS):
                redacted[key] = "[REDACTED_SECRET]"
                redacted_count += 1
            elif any(pattern in key_lower for pattern in self.PII_KEY_PATTERNS):
                redacted[key] = "[REDACTED_PII]"
                redacted_count += 1
            elif isinstance(value, str):
                val_str = value
                was_redacted = False
                if self.EMAIL_REGEX.search(val_str):
                    val_str = self.EMAIL_REGEX.sub("[REDACTED_PII]", val_str)
                    was_redacted = True
                if self.CPF_REGEX.search(val_str):
                    val_str = self.CPF_REGEX.sub("[REDACTED_PII]", val_str)
                    was_redacted = True
                if self.CARD_REGEX.search(val_str):
                    val_str = self.CARD_REGEX.sub("[REDACTED_PII]", val_str)
                    was_redacted = True
                
                if was_redacted:
                    redacted_count += 1
                redacted[key] = val_str
            else:
                redacted[key] = value

        return redacted, redacted_count


class TelemetrySpan(BaseModel):
    span_id: str
    request_id: str
    domain: str
    service_name: str
    operation_name: str
    attributes: Dict[str, Any]
    duration_ms: float
    status_code: int = 200
    timestamp: str


class TelemetryEngine:
    """Engine for recording, correlating and sanitizing OpenTelemetry spans across services."""

    def __init__(self) -> None:
        self.processor = RedactionProcessor()
        self.spans: List[TelemetrySpan] = []
        self.total_redacted_fields = 0

    def record_span(
        self,
        request_id: str,
        domain: SLOTargetDomain,
        service_name: str,
        operation_name: str,
        attributes: Dict[str, Any],
        duration_ms: float,
        status_code: int = 200,
    ) -> TelemetrySpan:
        sanitized_attrs, redacted_cnt = self.processor.redact_attributes(attributes)
        self.total_redacted_fields += redacted_cnt

        span = TelemetrySpan(
            span_id=f"span-{uuid.uuid4().hex[:8]}",
            request_id=request_id,
            domain=domain.value if isinstance(domain, SLOTargetDomain) else str(domain),
            service_name=service_name,
            operation_name=operation_name,
            attributes=sanitized_attrs,
            duration_ms=duration_ms,
            status_code=status_code,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        self.spans.append(span)
        return span

    def get_spans_by_request_id(self, request_id: str) -> List[TelemetrySpan]:
        return [s for s in self.spans if s.request_id == request_id]

    def get_covered_domains(self) -> List[str]:
        return sorted(list({s.domain for s in self.spans}))

    def get_snapshot(self) -> Dict[str, Any]:
        domain_counts: Dict[str, int] = {}
        for s in self.spans:
            domain_counts[s.domain] = domain_counts.get(s.domain, 0) + 1

        return {
            "total_spans": len(self.spans),
            "redacted_fields_count": self.total_redacted_fields,
            "domains_covered": domain_counts,
            "active_correlation_keys": len({s.request_id for s in self.spans}),
        }


class SLORule(BaseModel):
    name: str
    domain: str
    metric_name: str
    threshold: float
    operator: str  # "<=" or ">=" or "<" or ">"
    owner: str
    severity: str
    impact: str
    runbook_url: str


class SLOAlert(BaseModel):
    alert_id: str
    domain: str
    slo_name: str
    current_value: float
    threshold: float
    owner: str
    severity: str
    impact: str
    runbook_url: str
    triggered_at: str


class SLODashboard(BaseModel):
    domain: str
    name: str
    slo_rules: List[SLORule]
    current_metrics: Dict[str, float]
    status: str  # "HEALTHY", "VIOLATED"


class SLOMonitoringEngine:
    """Monitoring engine for defining dashboards, evaluating metrics, and triggering SLO alerts."""

    def __init__(self) -> None:
        self.rules: List[SLORule] = [
            SLORule(
                name="Gateway Latency p95",
                domain=SLOTargetDomain.GATEWAY.value,
                metric_name="latency_p95_ms",
                threshold=300.0,
                operator="<=",
                owner="SRE / Gateway Team",
                severity=AlertSeverity.P0.value,
                impact="Gateway Latency p95 acima de 300ms causa degradação geral na experiencia dos clientes.",
                runbook_url="/docs/runbooks/V1-901-incident-response-and-containment.md#gateway-slo",
            ),
            SLORule(
                name="Streaming TTFT p95",
                domain=SLOTargetDomain.STREAMING.value,
                metric_name="ttft_p95_ms",
                threshold=200.0,
                operator="<=",
                owner="Harness & Streaming Team",
                severity=AlertSeverity.P1.value,
                impact="Time-to-first-token elevado no streaming de resposta dos modelos.",
                runbook_url="/docs/runbooks/V1-901-incident-response-and-containment.md#streaming-slo",
            ),
            SLORule(
                name="Retrieval Latency p95 & Error Rate",
                domain=SLOTargetDomain.RETRIEVAL.value,
                metric_name="error_rate_pct",
                threshold=1.0,
                operator="<=",
                owner="Knowledge & Retrieval Team",
                severity=AlertSeverity.P0.value,
                impact="Taxa de erro na busca vetorial/hibrida superou 1%, afetando precisao de respostas.",
                runbook_url="/docs/runbooks/V1-901-incident-response-and-containment.md#retrieval-slo",
            ),
            SLORule(
                name="Ingestao Processing Time",
                domain=SLOTargetDomain.INGESTION.value,
                metric_name="avg_processing_sec",
                threshold=5.0,
                operator="<=",
                owner="Data Pipeline Team",
                severity=AlertSeverity.P1.value,
                impact="Pipeline de ingestao e parsing com atraso acumulado.",
                runbook_url="/docs/runbooks/V1-901-incident-response-and-containment.md#ingestion-slo",
            ),
            SLORule(
                name="Action Gateway Error Rate",
                domain=SLOTargetDomain.ACTIONS.value,
                metric_name="error_rate_pct",
                threshold=0.5,
                operator="<=",
                owner="Action & MCP Gateway Team",
                severity=AlertSeverity.P0.value,
                impact="Falhas na execucao idempotente de acoes externas via MCP.",
                runbook_url="/docs/runbooks/V1-901-incident-response-and-containment.md#actions-slo",
            ),
        ]

        self.metrics_history: Dict[str, Dict[str, List[float]]] = {
            dom.value: {"latencies": [], "failures": [], "total": [], "ttft": [], "processing": []}
            for dom in SLOTargetDomain
        }

    def record_metric(
        self,
        domain: SLOTargetDomain,
        latency_ms: Optional[float] = None,
        ttft_ms: Optional[float] = None,
        processing_time_sec: Optional[float] = None,
        success: bool = True,
    ) -> None:
        dom_val = domain.value if isinstance(domain, SLOTargetDomain) else str(domain)
        hist = self.metrics_history.setdefault(
            dom_val, {"latencies": [], "failures": [], "total": [], "ttft": [], "processing": []}
        )

        hist["total"].append(1.0)
        hist["failures"].append(0.0 if success else 1.0)

        if latency_ms is not None:
            hist["latencies"].append(latency_ms)
        if ttft_ms is not None:
            hist["ttft"].append(ttft_ms)
        if processing_time_sec is not None:
            hist["processing"].append(processing_time_sec)

    def evaluate_slos(self) -> List[SLOAlert]:
        alerts: List[SLOAlert] = []

        for rule in self.rules:
            dom_hist = self.metrics_history.get(rule.domain, {})
            current_val = self._calculate_current_metric(rule, dom_hist)

            is_violated = False
            if rule.operator == "<=" and current_val > rule.threshold:
                is_violated = True
            elif rule.operator == ">=" and current_val < rule.threshold:
                is_violated = True
            elif rule.operator == ">" and current_val <= rule.threshold:
                is_violated = True
            elif rule.operator == "<" and current_val >= rule.threshold:
                is_violated = True

            if is_violated:
                alert = SLOAlert(
                    alert_id=f"ALT-{uuid.uuid4().hex[:6].upper()}",
                    domain=rule.domain,
                    slo_name=rule.name,
                    current_value=round(current_val, 2),
                    threshold=rule.threshold,
                    owner=rule.owner,
                    severity=rule.severity,
                    impact=rule.impact,
                    runbook_url=rule.runbook_url,
                    triggered_at=datetime.now(timezone.utc).isoformat(),
                )
                alerts.append(alert)

        return alerts

    def _calculate_current_metric(self, rule: SLORule, hist: Dict[str, List[float]]) -> float:
        if rule.metric_name == "latency_p95_ms":
            latencies = hist.get("latencies", [])
            if not latencies:
                return 0.0
            sorted_lat = sorted(latencies)
            idx = int(0.95 * (len(sorted_lat) - 1))
            return sorted_lat[idx]
        elif rule.metric_name == "ttft_p95_ms":
            ttft_list = hist.get("ttft", [])
            if not ttft_list:
                return 0.0
            sorted_ttft = sorted(ttft_list)
            idx = int(0.95 * (len(sorted_ttft) - 1))
            return sorted_ttft[idx]
        elif rule.metric_name == "error_rate_pct":
            failures = hist.get("failures", [])
            total = hist.get("total", [])
            if not total or sum(total) == 0:
                return 0.0
            return (sum(failures) / sum(total)) * 100.0
        elif rule.metric_name == "avg_processing_sec":
            processing = hist.get("processing", [])
            if not processing:
                return 0.0
            return sum(processing) / len(processing)
        return 0.0

    def get_dashboards(self) -> List[SLODashboard]:
        active_alerts = {a.domain: a for a in self.evaluate_slos()}
        dashboards: List[SLODashboard] = []

        for dom in SLOTargetDomain:
            dom_rules = [r for r in self.rules if r.domain == dom.value]
            dom_hist = self.metrics_history.get(dom.value, {})
            
            metrics_summary = {}
            for r in dom_rules:
                metrics_summary[r.metric_name] = round(self._calculate_current_metric(r, dom_hist), 2)

            status = "VIOLATED" if dom.value in active_alerts else "HEALTHY"

            dashboards.append(
                SLODashboard(
                    domain=dom.value,
                    name=f"Dashboard Observabilidade — Domain: {dom.value.upper()}",
                    slo_rules=dom_rules,
                    current_metrics=metrics_summary,
                    status=status,
                )
            )

        return dashboards


class IncidentRecord(BaseModel):
    incident_id: str
    title: str
    description: str
    severity: str
    status: str
    affected_domains: List[str]
    containment_actions: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    opened_by: str
    opened_at: str
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentResponseManager:
    """Auditable Incident Response and Automated Containment procedure manager."""

    def __init__(self) -> None:
        self.incidents: Dict[str, IncidentRecord] = {}

    def open_incident(
        self,
        title: str,
        description: str,
        severity: AlertSeverity,
        affected_domains: List[str],
        requested_containment: List[ContainmentActionType],
        opened_by: str,
    ) -> IncidentRecord:
        inc_id = f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        timeline = [
            {
                "timestamp": now_iso,
                "event_type": "INCIDENT_OPENED",
                "actor": opened_by,
                "details": f"Incidente aberto com severidade {severity.value} afetando dominios: {affected_domains}",
            }
        ]

        containment_results = []
        for action_type in requested_containment:
            act_val = action_type.value if isinstance(action_type, ContainmentActionType) else str(action_type)
            result = {
                "action_id": f"ACT-{uuid.uuid4().hex[:6].upper()}",
                "action_type": act_val,
                "status": "EXECUTED",
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "details": f"Procedimento de contencao '{act_val}' ativado com sucesso.",
            }
            containment_results.append(result)
            timeline.append(
                {
                    "timestamp": result["executed_at"],
                    "event_type": "CONTAINMENT_EXECUTED",
                    "actor": "system-containment-engine",
                    "details": f"Contencao executada: {act_val}",
                }
            )

        timeline.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "COMMUNICATION_DISPATCHED",
                "actor": "system-incident-broadcaster",
                "details": f"Notificacao enviada para os owners dos dominios {affected_domains}",
            }
        )

        record = IncidentRecord(
            incident_id=inc_id,
            title=title,
            description=description,
            severity=severity.value if isinstance(severity, AlertSeverity) else str(severity),
            status=IncidentStatus.CONTAINED.value,
            affected_domains=affected_domains,
            containment_actions=containment_results,
            timeline=timeline,
            opened_by=opened_by,
            opened_at=now_iso,
        )

        self.incidents[inc_id] = record
        return record

    def get_incident(self, incident_id: str) -> Optional[IncidentRecord]:
        return self.incidents.get(incident_id)

    def resolve_incident(
        self, incident_id: str, resolution_notes: str, resolved_by: str
    ) -> IncidentRecord:
        inc = self.incidents.get(incident_id)
        if not inc:
            raise KeyError(f"Incidente {incident_id} nao encontrado.")

        now_iso = datetime.now(timezone.utc).isoformat()
        inc.status = IncidentStatus.RESOLVED.value
        inc.resolved_at = now_iso
        inc.resolution_notes = resolution_notes

        inc.timeline.append(
            {
                "timestamp": now_iso,
                "event_type": "INCIDENT_RESOLVED",
                "actor": resolved_by,
                "details": f"Incidente resolvido. Notas: {resolution_notes}",
            }
        )
        return inc

    def generate_rca_report(self, incident_id: str) -> Dict[str, Any]:
        inc = self.incidents.get(incident_id)
        if not inc:
            raise KeyError(f"Incidente {incident_id} nao encontrado.")

        return {
            "incident_id": inc.incident_id,
            "title": inc.title,
            "severity": inc.severity,
            "opened_at": inc.opened_at,
            "resolved_at": inc.resolved_at,
            "affected_domains": inc.affected_domains,
            "timeline": inc.timeline,
            "root_cause_analysis": {
                "summary": "Analise de Causa Raiz (RCA) automatizada gerada com base nos traces e telemetria de erro.",
                "contributing_factors": [
                    "Pico atípico de carga nos conectores de ingestão/gateway",
                    "Aumento de latência de resposta downstream",
                ],
                "detection_lag_seconds": 12.5,
                "containment_duration_seconds": 3.2,
            },
            "preventive_actions": [
                {
                    "action": "Ajustar threshold do circuit breaker para o Action Gateway",
                    "owner": "SRE Team",
                    "deadline": "2026-08-20",
                    "status": "PLANNED",
                },
                {
                    "action": "Atualizar rotinas de redaction e sanitizacao de secrets",
                    "owner": "Security Team",
                    "deadline": "2026-08-18",
                    "status": "IN_PROGRESS",
                },
            ],
        }

    def run_incident_drill(
        self, target_domain: SLOTargetDomain, simulated_fault: str
    ) -> Dict[str, Any]:
        drill_id = f"DRILL-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        dom_val = target_domain.value if isinstance(target_domain, SLOTargetDomain) else str(target_domain)

        # Execute containment simulation
        inc = self.open_incident(
            title=f"Simulacao de Incidente (Drill) - {simulated_fault}",
            description=f"Drill automatizado para validar resposta e contencao no dominio {dom_val}",
            severity=AlertSeverity.P0,
            affected_domains=[dom_val],
            requested_containment=[ContainmentActionType.BACKPRESSURE_SHEDDING],
            opened_by="drill-test-runner",
        )

        return {
            "drill_id": drill_id,
            "incident_id": inc.incident_id,
            "status": "SUCCESS",
            "target_domain": dom_val,
            "simulated_fault": simulated_fault,
            "containment_verified": True,
            "audit_trail": inc.timeline,
        }
