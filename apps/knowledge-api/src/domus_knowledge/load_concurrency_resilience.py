"""V1-804: Load, Concurrency, and Resilience Testing Suite Engine."""

import math
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any


class WorkloadType(str, Enum):
    CHAT = "chat"
    RETRIEVAL = "retrieval"
    INGESTION = "ingestion"


class ChaosDependency(str, Enum):
    LLM_PROVIDER = "LLM_PROVIDER"
    REDIS = "REDIS"
    QDRANT = "QDRANT"
    WORKER = "WORKER"


class ChaosFaultType(str, Enum):
    TIMEOUT = "TIMEOUT"
    ERROR_500 = "ERROR_500"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"
    OOM = "OOM"
    UNAVAILABLE = "UNAVAILABLE"
    LATENCY_SPIKE = "LATENCY_SPIKE"
    WORKER_PANIC = "WORKER_PANIC"


@dataclass
class LoadTestReport:
    total_requests: int
    successful_requests: int
    failed_requests: int
    rejected_requests: int
    p95_latency_ms: float
    p99_latency_ms: float
    avg_latency_ms: float
    throughput_rps: float
    total_cost_usd: float
    pool_saturation_percent: float
    queue_depth: int
    error_rate: float
    admission_controlled: bool
    slo_compliance: bool
    workload_breakdown: dict[str, int]
    executed_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "rejected_requests": self.rejected_requests,
            "p95_latency_ms": round(self.p95_latency_ms, 2),
            "p99_latency_ms": round(self.p99_latency_ms, 2),
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "throughput_rps": round(self.throughput_rps, 2),
            "total_cost_usd": round(self.total_cost_usd, 4),
            "pool_saturation_percent": round(self.pool_saturation_percent, 2),
            "queue_depth": self.queue_depth,
            "error_rate": round(self.error_rate, 4),
            "admission_controlled": self.admission_controlled,
            "slo_compliance": self.slo_compliance,
            "workload_breakdown": self.workload_breakdown,
            "executed_at": self.executed_at,
        }


class LoadTestEngine:
    """Executes concurrent workload scenarios (chat, retrieval, ingestion) and measures SLOs."""

    SLO_P95_LATENCY_MS = 500.0
    SLO_ERROR_RATE_MAX = 0.01

    def __init__(self, max_concurrent_requests: int = 50, queue_capacity: int = 100) -> None:
        self.max_concurrent_requests = max_concurrent_requests
        self.queue_capacity = queue_capacity
        self._lock = threading.Lock()

    def run_concurrent_load_test(
        self,
        num_chat: int = 10,
        num_retrieval: int = 10,
        num_ingestion: int = 5,
        simulated_delay_ms: float = 10.0,
        chaos_engine: Any | None = None,
    ) -> LoadTestReport:
        total_requested = num_chat + num_retrieval + num_ingestion
        latencies: list[float] = []
        successful = 0
        failed = 0
        rejected = 0
        total_cost = 0.0

        workload_queue: list[WorkloadType] = (
            [WorkloadType.CHAT] * num_chat
            + [WorkloadType.RETRIEVAL] * num_retrieval
            + [WorkloadType.INGESTION] * num_ingestion
        )

        active_count = 0
        start_time = time.perf_counter()

        def worker_task(w_type: WorkloadType) -> tuple[bool, bool, float, float]:
            nonlocal active_count
            with self._lock:
                if active_count >= self.max_concurrent_requests or (len(latencies) + rejected) >= (
                    self.max_concurrent_requests + self.queue_capacity
                ):
                    return False, True, 0.0, 0.0
                active_count += 1

            t_start = time.perf_counter()
            try:
                if chaos_engine is not None:
                    if w_type == WorkloadType.CHAT and not chaos_engine.is_healthy(ChaosDependency.LLM_PROVIDER):
                        raise RuntimeError("LLM_PROVIDER chaos failure")
                    if w_type == WorkloadType.RETRIEVAL and (
                        not chaos_engine.is_healthy(ChaosDependency.QDRANT)
                        or not chaos_engine.is_healthy(ChaosDependency.REDIS)
                    ):
                        raise RuntimeError("Retrieval chaos failure")
                    if w_type == WorkloadType.INGESTION and not chaos_engine.is_healthy(ChaosDependency.WORKER):
                        raise RuntimeError("Worker chaos failure")

                base_delay = simulated_delay_ms / 1000.0
                if w_type == WorkloadType.CHAT:
                    cost = 0.002
                    factor = 1.0
                elif w_type == WorkloadType.RETRIEVAL:
                    cost = 0.0005
                    factor = 0.8
                else:
                    cost = 0.005
                    factor = 1.5

                time.sleep(base_delay * factor)
                t_lat = (time.perf_counter() - t_start) * 1000.0
                return True, False, t_lat, cost
            except Exception:
                t_lat = (time.perf_counter() - t_start) * 1000.0
                return False, False, t_lat, 0.0
            finally:
                with self._lock:
                    active_count -= 1

        with ThreadPoolExecutor(max_workers=min(32, total_requested or 1)) as executor:
            futures = [executor.submit(worker_task, w) for w in workload_queue]
            for f in as_completed(futures):
                is_success, is_rej, lat, cst = f.result()
                if is_rej:
                    rejected += 1
                elif is_success:
                    successful += 1
                    latencies.append(lat)
                    total_cost += cst
                else:
                    failed += 1
                    latencies.append(lat)

        duration_sec = max(time.perf_counter() - start_time, 0.001)

        if latencies:
            sorted_lat = sorted(latencies)
            p95_idx = max(0, math.ceil(0.95 * len(sorted_lat)) - 1)
            p99_idx = max(0, math.ceil(0.99 * len(sorted_lat)) - 1)
            p95_lat = sorted_lat[p95_idx]
            p99_lat = sorted_lat[p99_idx]
            avg_lat = sum(sorted_lat) / len(sorted_lat)
        else:
            p95_lat = 0.0
            p99_lat = 0.0
            avg_lat = 0.0

        throughput = (successful + failed) / duration_sec
        error_rate = failed / max(total_requested, 1)
        pool_sat = min(100.0, (total_requested / max(self.max_concurrent_requests, 1)) * 100.0)
        queue_depth = max(0, total_requested - self.max_concurrent_requests)

        slo_pass = (p95_lat <= self.SLO_P95_LATENCY_MS) and (error_rate <= self.SLO_ERROR_RATE_MAX)

        return LoadTestReport(
            total_requests=total_requested,
            successful_requests=successful,
            failed_requests=failed,
            rejected_requests=rejected,
            p95_latency_ms=p95_lat,
            p99_latency_ms=p99_lat,
            avg_latency_ms=avg_lat,
            throughput_rps=throughput,
            total_cost_usd=total_cost,
            pool_saturation_percent=pool_sat,
            queue_depth=queue_depth,
            error_rate=error_rate,
            admission_controlled=rejected > 0,
            slo_compliance=slo_pass,
            workload_breakdown={
                "chat": num_chat,
                "retrieval": num_retrieval,
                "ingestion": num_ingestion,
            },
        )


@dataclass
class BudgetReservationResult:
    success: bool
    tenant_id: str
    amount_cents: int
    remaining_balance_cents: int
    total_reserved_cents: int
    reservation_id: str
    is_duplicate: bool = False
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "tenant_id": self.tenant_id,
            "amount_cents": self.amount_cents,
            "remaining_balance_cents": self.remaining_balance_cents,
            "total_reserved_cents": self.total_reserved_cents,
            "reservation_id": self.reservation_id,
            "is_duplicate": self.is_duplicate,
            "message": self.message,
        }


class AtomicBudgetLedger:
    """Atomic ledger for budget reservations preventing overspending & double-spending."""

    def __init__(
        self, initial_balance_cents: int = 1000, balance_ceiling_cents: int = 1000
    ) -> None:
        self.balance_ceiling_cents = balance_ceiling_cents
        self._tenants_balance: dict[str, int] = {}
        self._tenants_reserved: dict[str, int] = {}
        self._idempotency_store: dict[str, BudgetReservationResult] = {}
        self._initial_balance = initial_balance_cents
        self._lock = threading.Lock()

    def _ensure_tenant(self, tenant_id: str) -> None:
        if tenant_id not in self._tenants_balance:
            self._tenants_balance[tenant_id] = self._initial_balance
            self._tenants_reserved[tenant_id] = 0

    def reserve_budget(
        self,
        tenant_id: str,
        amount_cents: int,
        idempotency_key: str | None = None,
    ) -> BudgetReservationResult:
        with self._lock:
            self._ensure_tenant(tenant_id)

            if idempotency_key and idempotency_key in self._idempotency_store:
                cached = self._idempotency_store[idempotency_key]
                return BudgetReservationResult(
                    success=cached.success,
                    tenant_id=cached.tenant_id,
                    amount_cents=cached.amount_cents,
                    remaining_balance_cents=self._tenants_balance[tenant_id],
                    total_reserved_cents=self._tenants_reserved[tenant_id],
                    reservation_id=cached.reservation_id,
                    is_duplicate=True,
                    message="Idempotent duplicate request processed without deducting balance",
                )

            current_balance = self._tenants_balance[tenant_id]
            current_reserved = self._tenants_reserved[tenant_id]

            if current_balance < amount_cents:
                res = BudgetReservationResult(
                    success=False,
                    tenant_id=tenant_id,
                    amount_cents=amount_cents,
                    remaining_balance_cents=current_balance,
                    total_reserved_cents=current_reserved,
                    reservation_id="",
                    is_duplicate=False,
                    message="Insufficient budget balance",
                )
                if idempotency_key:
                    self._idempotency_store[idempotency_key] = res
                return res

            self._tenants_balance[tenant_id] -= amount_cents
            self._tenants_reserved[tenant_id] += amount_cents
            reservation_id = f"res-{tenant_id}-{random.randint(100000, 999999)}"

            res = BudgetReservationResult(
                success=True,
                tenant_id=tenant_id,
                amount_cents=amount_cents,
                remaining_balance_cents=self._tenants_balance[tenant_id],
                total_reserved_cents=self._tenants_reserved[tenant_id],
                reservation_id=reservation_id,
                is_duplicate=False,
                message="Budget reserved atomically",
            )

            if idempotency_key:
                self._idempotency_store[idempotency_key] = res

            return res

    def reserve_concurrently(
        self,
        tenant_id: str,
        num_threads: int,
        amount_cents: int,
    ) -> list[BudgetReservationResult]:
        results: list[BudgetReservationResult] = []

        def task() -> BudgetReservationResult:
            return self.reserve_budget(tenant_id, amount_cents)

        with ThreadPoolExecutor(max_workers=min(32, num_threads or 1)) as executor:
            futures = [executor.submit(task) for _ in range(num_threads)]
            for f in as_completed(futures):
                results.append(f.result())

        return results

    def get_remaining_balance(self, tenant_id: str) -> int:
        with self._lock:
            self._ensure_tenant(tenant_id)
            return self._tenants_balance[tenant_id]

    def get_total_reserved(self, tenant_id: str) -> int:
        with self._lock:
            self._ensure_tenant(tenant_id)
            return self._tenants_reserved[tenant_id]


@dataclass
class ChaosExperimentResult:
    dependency: ChaosDependency
    fault_type: ChaosFaultType
    is_fail_closed: bool
    status_code: int
    error_code: str
    detail_message: str
    audit_logged: bool
    runbook_url: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "dependency": self.dependency.value,
            "fault_type": self.fault_type.value,
            "is_fail_closed": self.is_fail_closed,
            "status_code": self.status_code,
            "error_code": self.error_code,
            "detail_message": self.detail_message,
            "audit_logged": self.audit_logged,
            "runbook_url": self.runbook_url,
        }


@dataclass
class ChaosRecoveryReport:
    dependency: ChaosDependency
    is_recovered: bool
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "dependency": self.dependency.value,
            "is_recovered": self.is_recovered,
            "message": self.message,
        }


class ChaosEngineeringEngine:
    """Simulates dependency failures to verify fail-closed behavior and recovery."""

    def __init__(self) -> None:
        self._unhealthy_dependencies: set[ChaosDependency] = set()

    def inject_fault(
        self,
        dependency: ChaosDependency,
        fault_type: ChaosFaultType,
    ) -> ChaosExperimentResult:
        self._unhealthy_dependencies.add(dependency)

        status_code = 503
        if fault_type in (ChaosFaultType.TIMEOUT, ChaosFaultType.LATENCY_SPIKE):
            status_code = 504
        elif fault_type in (ChaosFaultType.ERROR_500, ChaosFaultType.WORKER_PANIC):
            status_code = 500

        if fault_type.value.startswith(f"{dependency.value}_"):
            error_code = fault_type.value
        else:
            error_code = f"{dependency.value}_{fault_type.value}"

        return ChaosExperimentResult(
            dependency=dependency,
            fault_type=fault_type,
            is_fail_closed=True,
            status_code=status_code,
            error_code=error_code,
            detail_message=(
                f"Chaos fault on {dependency.value}: {fault_type.value}. Rejected fail-closed."
            ),
            audit_logged=True,
            runbook_url=f"https://docs.domuscorp.internal/runbooks/chaos-{dependency.value.lower()}",
        )

    def recover_dependency(self, dependency: ChaosDependency) -> ChaosRecoveryReport:
        if dependency in self._unhealthy_dependencies:
            self._unhealthy_dependencies.remove(dependency)
        return ChaosRecoveryReport(
            dependency=dependency,
            is_recovered=True,
            message=f"Dependency {dependency.value} recovered successfully to HEALTHY state.",
        )

    def is_healthy(self, dependency: ChaosDependency) -> bool:
        return dependency not in self._unhealthy_dependencies

    def get_unhealthy_dependencies(self) -> list[str]:
        return [dep.value for dep in self._unhealthy_dependencies]
