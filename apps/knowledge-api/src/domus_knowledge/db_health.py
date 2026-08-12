"""Database health monitoring, telemetry, and gateway backpressure shedding engine."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Optional


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class QdrantStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"


class BackupHealthStatus(str, Enum):
    OK = "OK"
    STALE = "STALE"
    FAILED = "FAILED"


@dataclass
class HealthAlert:
    metric: str
    severity: AlertSeverity
    owner: str  # DBA or SRE
    message: str
    value: Any
    threshold: Any
    runbook_url: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric": self.metric,
            "severity": self.severity.value,
            "owner": self.owner,
            "message": self.message,
            "value": self.value,
            "threshold": self.threshold,
            "runbook_url": self.runbook_url,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class DatabaseHealthMetrics:
    active_connections: int = 0
    max_connections: int = 100
    waiting_connections: int = 0
    lock_waits: int = 0
    deadlock_count: int = 0
    slow_queries_count: int = 0
    max_query_time_ms: float = 0.0
    disk_usage_percent: float = 0.0
    io_latency_ms: float = 0.0
    qdrant_status: QdrantStatus = QdrantStatus.HEALTHY
    qdrant_latency_ms: float = 0.0
    backup_status: BackupHealthStatus = BackupHealthStatus.OK
    last_backup_age_hours: float = 0.0

    @property
    def pool_saturation_percent(self) -> float:
        if self.max_connections <= 0:
            return 0.0
        return round((self.active_connections / self.max_connections) * 100.0, 2)

    def to_dict(self) -> dict[str, Any]:
        return {
            "active_connections": self.active_connections,
            "max_connections": self.max_connections,
            "waiting_connections": self.waiting_connections,
            "pool_saturation_percent": self.pool_saturation_percent,
            "lock_waits": self.lock_waits,
            "deadlock_count": self.deadlock_count,
            "slow_queries_count": self.slow_queries_count,
            "max_query_time_ms": self.max_query_time_ms,
            "disk_usage_percent": self.disk_usage_percent,
            "io_latency_ms": self.io_latency_ms,
            "qdrant_status": self.qdrant_status.value,
            "qdrant_latency_ms": self.qdrant_latency_ms,
            "backup_status": self.backup_status.value,
            "last_backup_age_hours": self.last_backup_age_hours,
        }


@dataclass
class HealthSnapshot:
    is_healthy: bool
    metrics: DatabaseHealthMetrics
    alerts: list[HealthAlert]
    checked_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return {
            "is_healthy": self.is_healthy,
            "metrics": self.metrics.to_dict(),
            "alerts": [a.to_dict() for a in self.alerts],
            "checked_at": self.checked_at.isoformat(),
        }


class DatabaseHealthMonitor:
    def __init__(self) -> None:
        self._current_metrics = DatabaseHealthMetrics()

    def record_metrics(self, metrics: DatabaseHealthMetrics) -> None:
        self._current_metrics = metrics

    def get_snapshot(self) -> HealthSnapshot:
        m = self._current_metrics
        alerts: list[HealthAlert] = []
        is_healthy = True

        runbook_base = "docs/runbooks/V1-705-dba-health-and-runbooks.md"

        # 1. Connection pool saturation check
        if m.pool_saturation_percent >= 85.0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="connection_pool_saturation",
                    severity=AlertSeverity.CRITICAL,
                    owner="DBA",
                    message=f"Connection pool saturated at {m.pool_saturation_percent}%",
                    value=m.pool_saturation_percent,
                    threshold=85.0,
                    runbook_url=f"{runbook_base}#runbook-1",
                )
            )

        # 2. Locks & deadlocks check
        if m.lock_waits > 0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="lock_waits",
                    severity=AlertSeverity.WARNING if m.lock_waits < 5 else AlertSeverity.CRITICAL,
                    owner="DBA",
                    message=f"Lock contention detected: {m.lock_waits} processes waiting",
                    value=m.lock_waits,
                    threshold=0,
                    runbook_url=f"{runbook_base}#runbook-2",
                )
            )

        if m.deadlock_count > 0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="deadlock_count",
                    severity=AlertSeverity.CRITICAL,
                    owner="DBA",
                    message=f"Deadlocks detected: {m.deadlock_count} deadlock events",
                    value=m.deadlock_count,
                    threshold=0,
                    runbook_url=f"{runbook_base}#runbook-2",
                )
            )

        # 3. Slow queries check
        if m.slow_queries_count > 5 or m.max_query_time_ms > 2000.0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="slow_queries",
                    severity=AlertSeverity.WARNING if m.max_query_time_ms < 5000.0 else AlertSeverity.CRITICAL,
                    owner="DBA",
                    message=f"Slow query spike detected: {m.slow_queries_count} slow queries, max latency {m.max_query_time_ms}ms",
                    value=m.max_query_time_ms,
                    threshold=2000.0,
                    runbook_url=f"{runbook_base}#runbook-3",
                )
            )

        # 4. Disk & IO usage check
        if m.disk_usage_percent >= 90.0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="disk_usage_percent",
                    severity=AlertSeverity.CRITICAL,
                    owner="SRE",
                    message=f"Disk space critical: {m.disk_usage_percent}% used",
                    value=m.disk_usage_percent,
                    threshold=90.0,
                    runbook_url=f"{runbook_base}#runbook-5",
                )
            )

        # 5. Qdrant availability check
        if m.qdrant_status != QdrantStatus.HEALTHY:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="qdrant_status",
                    severity=AlertSeverity.CRITICAL if m.qdrant_status == QdrantStatus.UNAVAILABLE else AlertSeverity.WARNING,
                    owner="SRE",
                    message=f"Qdrant vector engine status: {m.qdrant_status.value}",
                    value=m.qdrant_status.value,
                    threshold=QdrantStatus.HEALTHY.value,
                    runbook_url=f"{runbook_base}#runbook-4",
                )
            )

        # 6. Backup status check
        if m.backup_status != BackupHealthStatus.OK or m.last_backup_age_hours > 24.0:
            is_healthy = False
            alerts.append(
                HealthAlert(
                    metric="backup_status",
                    severity=AlertSeverity.CRITICAL,
                    owner="DBA",
                    message=f"Backup health alert: status={m.backup_status.value}, age={m.last_backup_age_hours}h",
                    value=m.backup_status.value,
                    threshold=BackupHealthStatus.OK.value,
                    runbook_url=f"{runbook_base}#runbook-5",
                )
            )

        return HealthSnapshot(
            is_healthy=is_healthy,
            metrics=m,
            alerts=alerts,
        )


@dataclass
class AdmissionDecision:
    should_shed: bool
    reason: str
    code: str
    saturation_percent: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "should_shed": self.should_shed,
            "reason": self.reason,
            "code": self.code,
            "saturation_percent": self.saturation_percent,
        }


class GatewayBackpressureEngine:
    def __init__(
        self,
        monitor: DatabaseHealthMonitor,
        saturation_threshold: float = 85.0,
        recovery_threshold: float = 75.0,
    ) -> None:
        self.monitor = monitor
        self.saturation_threshold = saturation_threshold
        self.recovery_threshold = recovery_threshold
        self._is_shedding_active = False

    def evaluate_admission(
        self,
        request_priority: str = "NORMAL",
        requires_vector_search: bool = False,
    ) -> AdmissionDecision:
        snapshot = self.monitor.get_snapshot()
        saturation = snapshot.metrics.pool_saturation_percent

        # Update shedding state based on thresholds
        if saturation >= self.saturation_threshold:
            self._is_shedding_active = True
        elif saturation <= self.recovery_threshold and snapshot.metrics.qdrant_status != QdrantStatus.UNAVAILABLE:
            self._is_shedding_active = False

        # Vector service check
        if requires_vector_search and snapshot.metrics.qdrant_status == QdrantStatus.UNAVAILABLE:
            return AdmissionDecision(
                should_shed=True,
                reason="Qdrant vector engine unavailable",
                code="QDRANT_UNAVAILABLE_SHEDDING",
                saturation_percent=saturation,
            )

        # Priority check during active shedding
        if self._is_shedding_active:
            if request_priority == "CRITICAL":
                return AdmissionDecision(
                    should_shed=False,
                    reason="CRITICAL_PRIORITY_BYPASS",
                    code="NORMAL_OPERATION",
                    saturation_percent=saturation,
                )
            return AdmissionDecision(
                should_shed=True,
                reason=f"Database pool saturation at {saturation}% exceeds limit",
                code="GATEWAY_BACKPRESSURE_SHEDDING",
                saturation_percent=saturation,
            )

        return AdmissionDecision(
            should_shed=False,
            reason="NORMAL_OPERATION",
            code="NORMAL_OPERATION",
            saturation_percent=saturation,
        )
