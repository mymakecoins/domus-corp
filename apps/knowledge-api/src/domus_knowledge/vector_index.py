"""Deterministic chunk and embedding metadata contracts; provider egress stays in TS gateway."""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol


class VectorIndexError(RuntimeError):
    pass


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    tenant_id: str
    workspace_id: str
    asset_id: str
    version_id: str
    source_id: str
    ordinal: int
    start_offset: int
    end_offset: int
    checksum: str
    classification: str
    policy_version: str
    chunking_version: str = "1"
    valid_until: str | None = None


@dataclass(frozen=True)
class Embedding:
    embedding_id: str
    chunk_id: str
    model_profile: str
    model_version: str
    dimensions: int
    vector_checksum: str
    index_version: str
    status: str = "READY"


class ModelGateway(Protocol):
    def embed(self, *, text: str, profile: str) -> Sequence[float]: ...


def derive_chunks(
    *,
    tenant_id: str,
    workspace_id: str,
    asset_id: str,
    version_id: str,
    source_id: str = "src_1",
    text: str,
    classification: str,
    policy_version: str,
    max_chars: int = 2048,
    valid_until: str | None = None,
) -> tuple[Chunk, ...]:
    if not text or max_chars < 1 or max_chars > 8192:
        raise VectorIndexError("CHUNK_INPUT_INVALID")
    parts = [text[i : i + max_chars] for i in range(0, len(text), max_chars)]
    if len(parts) > 200:
        raise VectorIndexError("CHUNK_LIMIT_EXCEEDED")
    out = []
    for ordinal, part in enumerate(parts):
        start = ordinal * max_chars
        checksum = f"sha256:{hashlib.sha256(part.encode()).hexdigest()}"
        chunk_id = hashlib.sha256(f"{version_id}:{ordinal}:{checksum}:1".encode()).hexdigest()
        out.append(
            Chunk(
                chunk_id,
                tenant_id,
                workspace_id,
                asset_id,
                version_id,
                source_id,
                ordinal,
                start,
                start + len(part),
                checksum,
                classification,
                policy_version,
                valid_until=valid_until,
            )
        )
    return tuple(out)


def create_embedding(
    chunk: Chunk,
    *,
    text: str,
    gateway: ModelGateway,
    profile: str,
    model_version: str,
    index_version: str,
    dimensions: int = 1536,
) -> Embedding:
    if (
        not text
        or dimensions < 1
        or dimensions > 4096
        or not profile
        or not model_version
        or not index_version
    ):
        raise VectorIndexError("EMBEDDING_INPUT_INVALID")
    vector = tuple(gateway.embed(text=text, profile=profile))
    if len(vector) != dimensions:
        raise VectorIndexError("EMBEDDING_DIMENSION_MISMATCH")
    digest = f"sha256:{hashlib.sha256(repr(vector).encode()).hexdigest()}"
    return Embedding(
        hashlib.sha256(f"{chunk.chunk_id}:{model_version}:{index_version}".encode()).hexdigest(),
        chunk.chunk_id,
        profile,
        model_version,
        dimensions,
        digest,
        index_version,
    )


def publish_embedding(
    *, embedding: Embedding, chunk: Chunk, tenant_id: str, workspace_id: str, policy_version: str
) -> dict[str, object]:
    if (tenant_id, workspace_id, policy_version) != (
        chunk.tenant_id,
        chunk.workspace_id,
        chunk.policy_version,
    ):
        raise VectorIndexError("EMBEDDING_SCOPE_DENIED")
    return {
        "embedding_id": embedding.embedding_id,
        "chunk_id": embedding.chunk_id,
        "tenant_id": tenant_id,
        "workspace_id": workspace_id,
        "index_version": embedding.index_version,
        "status": embedding.status,
    }
