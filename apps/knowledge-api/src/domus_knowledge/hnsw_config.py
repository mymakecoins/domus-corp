"""HNSW and vector index optimization contracts for Qdrant and PostgreSQL."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class OptimizationPreset(str, Enum):
    BALANCED = "BALANCED"
    HIGH_THROUGHPUT = "HIGH_THROUGHPUT"
    HIGH_RECALL = "HIGH_RECALL"
    LOW_MEMORY = "LOW_MEMORY"


@dataclass(frozen=True)
class HNSWConfig:
    m: int
    ef_construct: int
    hnsw_ef: int
    distance: str = "Cosine"
    max_indexing_threads: int = 4
    on_disk_payload: bool = True


@dataclass(frozen=True)
class PayloadFilterConfig:
    indexed_fields: tuple[str, ...] = (
        "tenant_id",
        "workspace_id",
        "source_id",
        "asset_id",
        "classification",
        "governance_state",
        "safety_decision",
        "index_version",
        "policy_version",
        "valid_until",
    )
    pre_filter_required: bool = True


def create_optimized_hnsw_config(
    preset: OptimizationPreset = OptimizationPreset.BALANCED,
    distance: str = "Cosine",
) -> HNSWConfig:
    if preset == OptimizationPreset.HIGH_THROUGHPUT:
        return HNSWConfig(m=32, ef_construct=256, hnsw_ef=128, distance=distance)
    elif preset == OptimizationPreset.HIGH_RECALL:
        return HNSWConfig(m=32, ef_construct=512, hnsw_ef=256, distance=distance)
    elif preset == OptimizationPreset.LOW_MEMORY:
        return HNSWConfig(m=8, ef_construct=64, hnsw_ef=32, distance=distance, on_disk_payload=True)
    else:  # BALANCED
        return HNSWConfig(m=16, ef_construct=128, hnsw_ef=64, distance=distance)
