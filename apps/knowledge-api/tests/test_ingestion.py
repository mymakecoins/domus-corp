from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import pytest

from domus_knowledge.ingestion import (
    IngestionJob,
    MemoryArtifactStore,
    MemoryIngestionRepository,
    ParserRegistry,
    process_ingestion,
)
from domus_knowledge.object_adapters import MemoryObjectStore
from domus_knowledge.objects import ObjectIdentity, ObjectRecord

IDENTITY = ObjectIdentity(
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "66666666-6666-4666-8666-666666666666",
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
    "55555555-5555-4555-8555-555555555555",
)


def source_record(
    data: bytes, media_type: str = "text/plain"
) -> tuple[ObjectRecord, MemoryObjectStore]:
    store = MemoryObjectStore()
    version = store.put_immutable("originals", IDENTITY.key(), [data], checksum(data))
    return (
        ObjectRecord(
            IDENTITY,
            "confidential",
            media_type,
            len(data),
            checksum(data),
            "originals",
            IDENTITY.key(),
            version.object_version,
            30,
            "AVAILABLE",
            datetime.now(UTC).isoformat(),
        ),
        store,
    )


def checksum(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def job(record: ObjectRecord, *, parser_version: str = "1.0.0") -> IngestionJob:
    return IngestionJob.from_object(
        job_id="99999999-9999-4999-8999-999999999999",
        record=record,
        policy_version="policy-v1",
        parser_profile="default",
        parser_version=parser_version,
        request_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        trace_id="b" * 32,
        fencing_token=1,
    )


@pytest.mark.parametrize(
    ("media_type", "data", "kind", "units"),
    [
        ("text/plain", b"ola\r\nmundo", "text", 1),
        ("application/json", b'{"b":2,"a":1}', "records", 1),
        ("text/csv", b"id,name\n1,Ana\n2,Beto\n", "records", 2),
    ],
)
def test_supported_input_is_normalized_with_stable_lineage(
    media_type: str, data: bytes, kind: str, units: int
) -> None:
    record, objects = source_record(data, media_type)
    repository, artifacts = MemoryIngestionRepository(), MemoryArtifactStore()
    result = process_ingestion(
        job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
    )
    assert result.state == "SUCCEEDED"
    assert result.manifest is not None
    assert result.manifest.kind == kind and len(result.manifest.units) == units
    assert result.manifest.original_checksum == record.checksum
    assert result.manifest.classification == "confidential"
    assert repository.events[-1] == "knowledge.ingestion.succeeded.v1"
    assert artifacts.read(result.manifest.artifact_key) != b""


def test_same_version_and_parser_is_idempotent_but_divergence_conflicts() -> None:
    record, objects = source_record(b"same")
    repository, artifacts = MemoryIngestionRepository(), MemoryArtifactStore()
    first = process_ingestion(
        job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
    )
    second = process_ingestion(
        job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
    )
    assert second == first and len(artifacts.objects) == 1
    changed = ObjectRecord(**{**record.__dict__, "checksum": checksum(b"different")})
    with pytest.raises(ValueError, match="INGESTION_CONFLICT"):
        process_ingestion(
            job(changed), changed, objects, artifacts, repository, ParserRegistry.defaults()
        )


def test_unavailable_tampered_and_invalid_content_fail_closed_without_artifact() -> None:
    record, objects = source_record(b"\xff", "text/plain")
    repository, artifacts = MemoryIngestionRepository(), MemoryArtifactStore()
    with pytest.raises(ValueError, match="INVALID_ENCODING"):
        process_ingestion(
            job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
        )
    assert artifacts.objects == {}
    unavailable = ObjectRecord(**{**record.__dict__, "state": "QUARANTINED"})
    with pytest.raises(ValueError, match="OBJECT_UNAVAILABLE"):
        process_ingestion(
            job(unavailable), unavailable, objects, artifacts, repository, ParserRegistry.defaults()
        )
    objects.objects[(record.bucket, record.object_key, record.object_version)] = b"tampered"
    with pytest.raises(RuntimeError, match="INTEGRITY_MISMATCH"):
        process_ingestion(
            job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
        )


def test_fencing_and_parser_limits_are_enforced() -> None:
    record, objects = source_record(b"{}", "application/json")
    repository, artifacts = MemoryIngestionRepository(), MemoryArtifactStore()
    repository.highest_fence = 2
    with pytest.raises(ValueError, match="STALE_FENCE"):
        process_ingestion(
            job(record), record, objects, artifacts, repository, ParserRegistry.defaults()
        )
    deep = b"[" * 65 + b"0" + b"]" * 65
    record, objects = source_record(deep, "application/json")
    with pytest.raises(ValueError, match="PARSER_RESOURCE_LIMIT"):
        process_ingestion(
            job(record),
            record,
            objects,
            artifacts,
            MemoryIngestionRepository(),
            ParserRegistry.defaults(),
        )
