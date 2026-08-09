"""Immutable knowledge object admission and lifecycle domain."""

from __future__ import annotations

import hashlib
import re
import tempfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Literal, Protocol

Classification = Literal["public", "internal", "confidential", "restricted"]
ObjectState = Literal[
    "PENDING_SCAN",
    "AVAILABLE",
    "QUARANTINED",
    "REJECTED",
    "ARCHIVED",
    "DELETION_PENDING",
    "DELETED",
]
MAX_OBJECT_BYTES = 100 * 1024 * 1024
ALLOWED_MEDIA_TYPES = frozenset({"application/pdf", "text/plain", "application/json", "text/csv"})
UUID = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I
)


@dataclass(frozen=True)
class ObjectIdentity:
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    version_id: str
    owner_id: str

    def key(self) -> str:
        values = (self.tenant_id, self.workspace_id, self.source_id, self.asset_id, self.version_id)
        if not all(UUID.fullmatch(value) for value in (*values, self.owner_id)):
            raise ValueError("KNOWLEDGE_OBJECT_IDENTITY_INVALID")
        return (
            f"tenant/{values[0]}/workspace/{values[1]}/source/{values[2]}/"
            f"asset/{values[3]}/version/{values[4]}/blob"
        )


@dataclass(frozen=True)
class ObjectRecord:
    identity: ObjectIdentity
    classification: Classification
    media_type: str
    size_bytes: int
    checksum: str
    bucket: Literal["originals", "quarantine"]
    object_key: str
    object_version: str
    retention_days: int
    state: ObjectState
    created_at: str
    version: int = 1


@dataclass(frozen=True)
class StoredObject:
    object_version: str
    size_bytes: int
    checksum: str
    encryption: str


class MalwareScanner(Protocol):
    def scan(
        self, chunks: Iterable[bytes], media_type: str
    ) -> Literal["CLEAN", "MALWARE", "INCONCLUSIVE"]: ...


class ObjectStore(Protocol):
    def put_immutable(
        self, bucket: str, key: str, chunks: Iterable[bytes], checksum: str
    ) -> StoredObject: ...

    def read_version(self, bucket: str, key: str, object_version: str) -> Iterable[bytes]: ...

    def delete_version(self, bucket: str, key: str, object_version: str) -> None: ...

    def version_exists(self, bucket: str, key: str, object_version: str) -> bool: ...


class ObjectRepository(Protocol):
    def find(self, identity: ObjectIdentity) -> ObjectRecord | None: ...
    def save_admission(self, record: ObjectRecord, event_type: str) -> None: ...


def _chunks(stream: object, size: int = 8 * 1024 * 1024) -> Iterator[bytes]:
    while True:
        value = stream.read(size)  # type: ignore[attr-defined]
        if not value:
            return
        yield value


def admit_object(
    *,
    identity: ObjectIdentity,
    classification: Classification,
    media_type: str,
    retention_days: int,
    chunks: Iterable[bytes],
    scanner: MalwareScanner,
    store: ObjectStore,
    repository: ObjectRepository,
    now: datetime,
    require_encryption: bool = True,
) -> ObjectRecord:
    key = identity.key()
    if retention_days < 1 or retention_days > 3650:
        raise ValueError("KNOWLEDGE_RETENTION_INVALID")
    if media_type not in ALLOWED_MEDIA_TYPES:
        raise ValueError("KNOWLEDGE_MEDIA_TYPE_REJECTED")
    digest = hashlib.sha256()
    size = 0
    with tempfile.SpooledTemporaryFile(max_size=1024 * 1024) as staged:
        for chunk in chunks:
            if not chunk:
                continue
            size += len(chunk)
            if size > MAX_OBJECT_BYTES:
                raise ValueError("KNOWLEDGE_OBJECT_TOO_LARGE")
            digest.update(chunk)
            staged.write(chunk)
        if size == 0:
            raise ValueError("KNOWLEDGE_OBJECT_EMPTY")
        checksum = f"sha256:{digest.hexdigest()}"
        existing = repository.find(identity)
        if existing is not None:
            if existing.checksum != checksum:
                raise ValueError("KNOWLEDGE_OBJECT_CONFLICT")
            return existing
        staged.seek(0)
        scan = scanner.scan(_chunks(staged), media_type)
        bucket: Literal["originals", "quarantine"] = (
            "originals" if scan == "CLEAN" else "quarantine"
        )
        staged.seek(0)
        stored = store.put_immutable(bucket, key, _chunks(staged), checksum)
        if stored.checksum != checksum or stored.size_bytes != size:
            raise RuntimeError("KNOWLEDGE_STORAGE_INTEGRITY_FAILED")
        if require_encryption and stored.encryption not in {"aws:kms", "AES256"}:
            raise RuntimeError("KNOWLEDGE_STORAGE_ENCRYPTION_REQUIRED")
        state: ObjectState = "AVAILABLE" if scan == "CLEAN" else "QUARANTINED"
        event = (
            "knowledge.object.accepted.v1"
            if state == "AVAILABLE"
            else "knowledge.object.quarantined.v1"
        )
        record = ObjectRecord(
            identity,
            classification,
            media_type,
            size,
            checksum,
            bucket,
            key,
            stored.object_version,
            retention_days,
            state,
            now.astimezone(UTC).isoformat(),
        )
        repository.save_admission(record, event)
        return record


def request_deletion(
    record: ObjectRecord, *, policy_allows: bool, legal_hold: bool
) -> ObjectRecord:
    if (
        record.state not in {"AVAILABLE", "ARCHIVED", "QUARANTINED"}
        or not policy_allows
        or legal_hold
    ):
        raise ValueError("KNOWLEDGE_DELETION_DENIED")
    return replace(record, state="DELETION_PENDING", version=record.version + 1)


def verify_restore(record: ObjectRecord, store: ObjectStore) -> bool:
    digest = hashlib.sha256()
    size = 0
    for chunk in store.read_version(record.bucket, record.object_key, record.object_version):
        size += len(chunk)
        digest.update(chunk)
    return size == record.size_bytes and f"sha256:{digest.hexdigest()}" == record.checksum


def complete_deletion(record: ObjectRecord, store: ObjectStore, now: datetime) -> ObjectRecord:
    if record.state != "DELETION_PENDING":
        raise ValueError("KNOWLEDGE_DELETION_DENIED")
    store.delete_version(record.bucket, record.object_key, record.object_version)
    if store.version_exists(record.bucket, record.object_key, record.object_version):
        raise RuntimeError("KNOWLEDGE_DELETION_AMBIGUOUS")
    del now
    return replace(record, state="DELETED", version=record.version + 1)
