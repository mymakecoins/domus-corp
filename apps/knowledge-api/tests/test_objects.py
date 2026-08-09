from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import pytest

from domus_knowledge.object_adapters import (
    EICAR,
    DeterministicScanner,
    MemoryObjectStore,
    S3ObjectStore,
)
from domus_knowledge.objects import (
    ObjectIdentity,
    admit_object,
    complete_deletion,
    request_deletion,
    verify_restore,
)


class Repository:
    def __init__(self) -> None:
        self.record = None
        self.event = None

    def find(self, identity):  # type: ignore[no-untyped-def]
        return self.record if self.record and self.record.identity == identity else None

    def save_admission(self, record, event_type):  # type: ignore[no-untyped-def]
        self.record, self.event = record, event_type


IDENTITY = ObjectIdentity(
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "66666666-6666-4666-8666-666666666666",
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
    "55555555-5555-4555-8555-555555555555",
)


def test_clean_object_is_immutable_available_and_restorable() -> None:
    repository, store = Repository(), MemoryObjectStore()
    record = admit_object(
        identity=IDENTITY,
        classification="confidential",
        media_type="application/pdf",
        retention_days=365,
        chunks=[b"synthetic", b" document"],
        scanner=DeterministicScanner(),
        store=store,
        repository=repository,
        now=datetime(2026, 8, 9, 12, tzinfo=UTC),
    )
    assert record.state == "AVAILABLE"
    assert record.object_key.endswith("/blob") and "synthetic" not in record.object_key
    assert repository.event == "knowledge.object.accepted.v1"
    assert verify_restore(record, store)
    assert (
        admit_object(
            identity=IDENTITY,
            classification="confidential",
            media_type="application/pdf",
            retention_days=365,
            chunks=[b"synthetic document"],
            scanner=DeterministicScanner(),
            store=store,
            repository=repository,
            now=datetime.now(UTC),
        )
        == record
    )


def test_malware_is_quarantined_and_never_available() -> None:
    repository, store = Repository(), MemoryObjectStore()
    record = admit_object(
        identity=IDENTITY,
        classification="restricted",
        media_type="text/plain",
        retention_days=30,
        chunks=[EICAR],
        scanner=DeterministicScanner(),
        store=store,
        repository=repository,
        now=datetime.now(UTC),
    )
    assert record.state == "QUARANTINED" and record.bucket == "quarantine"
    assert repository.event == "knowledge.object.quarantined.v1"


def test_conflict_size_format_and_deletion_fail_closed() -> None:
    repository, store = Repository(), MemoryObjectStore()
    record = admit_object(
        identity=IDENTITY,
        classification="internal",
        media_type="application/json",
        retention_days=10,
        chunks=[b"{}"],
        scanner=DeterministicScanner(),
        store=store,
        repository=repository,
        now=datetime.now(UTC),
    )
    with pytest.raises(ValueError, match="CONFLICT"):
        admit_object(
            identity=IDENTITY,
            classification="internal",
            media_type="application/json",
            retention_days=10,
            chunks=[b'{"changed":true}'],
            scanner=DeterministicScanner(),
            store=store,
            repository=repository,
            now=datetime.now(UTC),
        )
    with pytest.raises(ValueError, match="MEDIA_TYPE"):
        admit_object(
            identity=IDENTITY,
            classification="internal",
            media_type="application/x-executable",
            retention_days=10,
            chunks=[b"x"],
            scanner=DeterministicScanner(),
            store=store,
            repository=Repository(),
            now=datetime.now(UTC),
        )
    with pytest.raises(ValueError, match="DELETION_DENIED"):
        request_deletion(record, policy_allows=True, legal_hold=True)


def test_restore_detects_tampering() -> None:
    repository, store = Repository(), MemoryObjectStore()
    record = admit_object(
        identity=IDENTITY,
        classification="public",
        media_type="text/plain",
        retention_days=1,
        chunks=[b"safe"],
        scanner=DeterministicScanner(),
        store=store,
        repository=repository,
        now=datetime.now(UTC),
    )
    store.objects[(record.bucket, record.object_key, record.object_version)] = b"tampered"
    assert not verify_restore(record, store)
    assert record.checksum == f"sha256:{hashlib.sha256(b'safe').hexdigest()}"


def test_deletion_is_two_phase_and_verified() -> None:
    repository, store = Repository(), MemoryObjectStore()
    record = admit_object(
        identity=IDENTITY,
        classification="internal",
        media_type="text/plain",
        retention_days=1,
        chunks=[b"expired"],
        scanner=DeterministicScanner(),
        store=store,
        repository=repository,
        now=datetime.now(UTC),
    )
    pending = request_deletion(record, policy_allows=True, legal_hold=False)
    deleted = complete_deletion(pending, store, datetime.now(UTC))
    assert deleted.state == "DELETED"
    assert not store.version_exists(record.bucket, record.object_key, record.object_version)


def test_s3_adapter_requires_tls_conditional_put_version_and_encryption() -> None:
    class Client:
        def __init__(self) -> None:
            self.put: dict[str, object] | None = None

        def put_object(self, **kwargs):  # type: ignore[no-untyped-def]
            self.put = kwargs
            assert kwargs["Body"].read() == b"streamed"
            return {"VersionId": "v7", "ServerSideEncryption": "aws:kms"}

        def get_object(self, **kwargs):  # type: ignore[no-untyped-def]
            raise AssertionError(kwargs)

        def delete_object(self, **kwargs):  # type: ignore[no-untyped-def]
            return {}

        def head_object(self, **kwargs):  # type: ignore[no-untyped-def]
            return {}

    with pytest.raises(ValueError, match="TLS_REQUIRED"):
        S3ObjectStore(Client(), endpoint_url="http://minio.invalid")
    client = Client()
    adapter = S3ObjectStore(client, endpoint_url="https://minio.invalid")
    checksum = f"sha256:{hashlib.sha256(b'streamed').hexdigest()}"
    stored = adapter.put_immutable("originals", "opaque/key", [b"stream", b"ed"], checksum)
    assert stored.object_version == "v7" and stored.encryption == "aws:kms"
    assert client.put is not None
    assert client.put["IfNoneMatch"] == "*"
