"""Zero-downtime parallel vector reindexing, cutover, rollback, and retrieval state management."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from .access_control import AuthorizedKnowledgeFilter
from .retrieval import RetrievalPage, hybrid_search
from .vector_benchmark import BenchmarkWorkloadItem, VectorBenchmarkEngine


class ReindexError(RuntimeError):
    pass


@dataclass(frozen=True)
class QualityValidationResult:
    is_valid: bool
    recall: float
    precision: float
    failure_reason: str | None = None


class VectorReindexEngine:
    """Engine managing parallel collection index building, quality validation, cutover, and rollback."""

    def __init__(self, active_index_version: str = "v1") -> None:
        self.active_index_version: str = active_index_version
        self.candidate_index_version: str | None = None
        self.previous_index_version: str | None = None
        self.status: str = "IDLE"
        self._records_by_version: dict[str, list[dict[str, Any]]] = {active_index_version: []}
        self.benchmark_engine = VectorBenchmarkEngine()

    def load_records(self, version: str, records: Sequence[Mapping[str, Any]]) -> None:
        self._records_by_version[version] = [dict(r) for r in records]

    def start_reindex(
        self,
        target_index_version: str,
        records: Sequence[Mapping[str, Any]] | None = None,
    ) -> None:
        if not target_index_version or target_index_version == self.active_index_version:
            raise ReindexError("REINDEX_TARGET_VERSION_INVALID")

        self.candidate_index_version = target_index_version
        self.status = "REINDEXING"

        if records is not None:
            self._records_by_version[target_index_version] = [dict(r) for r in records]
        elif target_index_version not in self._records_by_version:
            self._records_by_version[target_index_version] = []

    def validate_quality(
        self,
        candidate_version: str,
        workload: Sequence[BenchmarkWorkloadItem],
        min_recall: float = 0.8,
        min_precision: float = 0.8,
    ) -> QualityValidationResult:
        if candidate_version not in self._records_by_version:
            return QualityValidationResult(
                is_valid=False,
                recall=0.0,
                precision=0.0,
                failure_reason=f"Candidate index version '{candidate_version}' not found.",
            )

        records = self._records_by_version[candidate_version]

        adjusted_workload = []
        for item in workload:
            vals = dict(item.authorized_filter.values)
            vals["index_version"] = candidate_version
            adj_filter = AuthorizedKnowledgeFilter(vals)
            adjusted_workload.append(
                BenchmarkWorkloadItem(
                    query=item.query,
                    authorized_filter=adj_filter,
                    expected_chunk_ids=item.expected_chunk_ids,
                )
            )

        report = self.benchmark_engine.run_benchmark(workload=adjusted_workload, records=records)

        is_valid = report.recall_at_k >= min_recall and report.precision_at_k >= min_precision
        reason = None if is_valid else (
            f"Recall {report.recall_at_k:.2f} < {min_recall:.2f} or "
            f"Precision {report.precision_at_k:.2f} < {min_precision:.2f}"
        )

        if is_valid:
            self.status = "READY_FOR_CUTOVER"

        return QualityValidationResult(
            is_valid=is_valid,
            recall=report.recall_at_k,
            precision=report.precision_at_k,
            failure_reason=reason,
        )

    def cutover(self, target_index_version: str | None = None) -> bool:
        target = target_index_version or self.candidate_index_version
        if not target or target not in self._records_by_version:
            raise ReindexError("CUTOVER_TARGET_INVALID")

        self.previous_index_version = self.active_index_version
        self.active_index_version = target
        self.candidate_index_version = None
        self.status = "COMPLETED"
        return True

    def rollback(self, target_index_version: str | None = None) -> bool:
        target = target_index_version or self.previous_index_version
        if not target or target not in self._records_by_version:
            # Fallback to initial version if previous is not explicitly stored
            target = "v1"
            if "v1" not in self._records_by_version:
                self._records_by_version["v1"] = []

        self.candidate_index_version = self.active_index_version
        self.active_index_version = target
        self.status = "ROLLED_BACK"
        return True

    def search(
        self,
        *,
        query: str,
        authorized_filter: AuthorizedKnowledgeFilter,
        cursor: str | None = None,
        limit: int = 50,
    ) -> RetrievalPage:
        # Pre-filtering & RLS enforcement: retrieve records for the active index version
        vals = dict(authorized_filter.values)
        vals["index_version"] = self.active_index_version
        adj_filter = AuthorizedKnowledgeFilter(vals)
        records = self._records_by_version.get(self.active_index_version, [])
        return hybrid_search(
            query=query,
            authorized_filter=adj_filter,
            records=records,
            cursor=cursor,
            limit=limit,
        )

    def get_status(self) -> dict[str, Any]:
        return {
            "active_index_version": self.active_index_version,
            "candidate_index_version": self.candidate_index_version,
            "previous_index_version": self.previous_index_version,
            "status": self.status,
            "total_versions_available": list(self._records_by_version.keys()),
        }
