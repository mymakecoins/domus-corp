from __future__ import annotations

from datetime import UTC, datetime

import pytest

from domus_knowledge.object_repository import PostgresObjectRepository
from domus_knowledge.objects import ObjectIdentity, ObjectRecord


class FakeCursor:
    def __init__(self, fail_at: int | None = None) -> None:
        self.calls: list[tuple[str, tuple[object, ...]]] = []
        self.fail_at = fail_at

    def execute(self, sql: str, values: tuple[object, ...] = ()) -> None:
        self.calls.append((sql, values))
        if self.fail_at == len(self.calls):
            raise RuntimeError("database unavailable")

    def fetchone(self):  # type: ignore[no-untyped-def]
        return None


class FakeConnection:
    def __init__(self, fail_at: int | None = None) -> None:
        self.value = FakeCursor(fail_at)
        self.committed = self.rolled_back = False

    def cursor(self) -> FakeCursor:
        return self.value

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


IDENTITY = ObjectIdentity(
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "66666666-6666-4666-8666-666666666666",
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
    "55555555-5555-4555-8555-555555555555",
)
RECORD = ObjectRecord(
    IDENTITY,
    "confidential",
    "application/pdf",
    4,
    "sha256:" + "a" * 64,
    "originals",
    IDENTITY.key(),
    "opaque-v1",
    365,
    "AVAILABLE",
    datetime(2026, 8, 9, tzinfo=UTC).isoformat(),
)


def test_admission_metadata_audit_and_outbox_commit_together() -> None:
    connection = FakeConnection()
    repository = PostgresObjectRepository(
        connection, "11111111-1111-4111-8111-111111111111", IDENTITY.owner_id, "policy-7"
    )
    repository.save_admission(RECORD, "knowledge.object.accepted.v1")
    sql = " ".join(call[0] for call in connection.value.calls)
    assert connection.committed and not connection.rolled_back
    assert "set_config('app.current_tenant_id'" in sql
    assert "knowledge_asset_version" in sql and "knowledge_object_outbox" in sql
    assert "synthetic" not in sql and RECORD.checksum not in sql


def test_admission_rolls_back_if_outbox_fails() -> None:
    connection = FakeConnection(fail_at=5)
    repository = PostgresObjectRepository(
        connection, "11111111-1111-4111-8111-111111111111", IDENTITY.owner_id, "policy-7"
    )
    with pytest.raises(RuntimeError, match="database unavailable"):
        repository.save_admission(RECORD, "knowledge.object.accepted.v1")
    assert connection.rolled_back and not connection.committed
