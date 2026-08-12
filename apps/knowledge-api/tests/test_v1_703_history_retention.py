"""
Unit and integration tests for V1-703: History Retention, Partitioning, and Safe Archiving.
Follows strict TDD rules.
"""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from domus_knowledge.history_retention import (
    ArchivedHistoryQueryEngine,
    ArchivedQueryRequest,
    ArchivedQueryResult,
    AutoPartitionManager,
    DataClass,
    DataRetentionMatrix,
    HistoryArchiveEngine,
    RetentionPolicy,
)
from domus_knowledge.main import create_app


@pytest.fixture
def temp_archive_dir(tmp_path: Path) -> Path:
    archive_dir = tmp_path / "cold_archive_storage"
    archive_dir.mkdir()
    return archive_dir


@pytest.fixture
def retention_matrix() -> DataRetentionMatrix:
    matrix = DataRetentionMatrix()
    matrix.set_policy(
        DataClass.AUDIT_EVENT,
        RetentionPolicy(
            data_class=DataClass.AUDIT_EVENT,
            retention_days=90,
            archive_before_purge=True,
            min_trace_fields=["tenant_id", "event_id", "occurred_at"],
        ),
    )
    matrix.set_policy(
        DataClass.COST_LEDGER,
        RetentionPolicy(
            data_class=DataClass.COST_LEDGER,
            retention_days=180,
            archive_before_purge=True,
            min_trace_fields=["tenant_id", "entry_id", "occurred_at"],
        ),
    )
    matrix.set_policy(
        DataClass.PROMPT_EXCEPTIONS,
        RetentionPolicy(
            data_class=DataClass.PROMPT_EXCEPTIONS,
            retention_days=30,
            archive_before_purge=True,
            min_trace_fields=["tenant_id", "exception_id", "occurred_at"],
        ),
    )
    matrix.set_policy(
        DataClass.TRANSCRIPTS,
        RetentionPolicy(
            data_class=DataClass.TRANSCRIPTS,
            retention_days=60,
            archive_before_purge=True,
            min_trace_fields=["tenant_id", "meeting_id", "occurred_at"],
        ),
    )
    matrix.set_policy(
        DataClass.SYSTEM_EVENTS,
        RetentionPolicy(
            data_class=DataClass.SYSTEM_EVENTS,
            retention_days=60,
            archive_before_purge=False,
            min_trace_fields=["tenant_id", "event_id", "occurred_at"],
        ),
    )
    return matrix


def test_data_retention_matrix_configuration(retention_matrix: DataRetentionMatrix) -> None:
    """
    Test retention matrix retrieval and custom policy update.
    """
    audit_policy = retention_matrix.get_policy(DataClass.AUDIT_EVENT)
    assert audit_policy.retention_days == 90
    assert audit_policy.archive_before_purge is True
    assert "tenant_id" in audit_policy.min_trace_fields

    ledger_policy = retention_matrix.get_policy(DataClass.COST_LEDGER)
    assert ledger_policy.retention_days == 180

    # Test update policy
    new_policy = RetentionPolicy(
        data_class=DataClass.AUDIT_EVENT,
        retention_days=60,
        archive_before_purge=True,
        min_trace_fields=["tenant_id", "event_id"],
    )
    retention_matrix.set_policy(DataClass.AUDIT_EVENT, new_policy)
    assert retention_matrix.get_policy(DataClass.AUDIT_EVENT).retention_days == 60


def test_auto_partition_manager_creates_range_partitions() -> None:
    """
    Test automatic date/range partitioning logic for high volume tables
    (audit_event, cost_ledger_entry). Missing partition definitions are generated.
    """
    partition_mgr = AutoPartitionManager()

    # 1. Register high volume tables
    partition_mgr.register_table("audit_event", partition_column="occurred_at")
    partition_mgr.register_table("cost_ledger_entry", partition_column="occurred_at")

    # 2. Check and generate partitions for next 2 months starting from 2026-08-01
    base_date = datetime(2026, 8, 1, tzinfo=UTC)
    created_partitions = partition_mgr.check_and_create_partitions(
        table_name="audit_event",
        from_date=base_date,
        months_ahead=2,
    )

    assert len(created_partitions) == 2
    p1 = created_partitions[0]
    assert p1.table_name == "audit_event"
    assert p1.partition_name == "audit_event_y2026m08"
    assert "2026-08-01" in p1.start_bound
    assert "2026-09-01" in p1.end_bound
    assert "CREATE INDEX" in p1.index_ddl

    # Idempotency check: running again for the same window returns 0 newly created partitions
    second_run = partition_mgr.check_and_create_partitions(
        table_name="audit_event",
        from_date=base_date,
        months_ahead=2,
    )
    assert len(second_run) == 0


def test_history_archive_engine_purges_and_archives_expired_data(
    retention_matrix: DataRetentionMatrix, temp_archive_dir: Path
) -> None:
    """
    Test that expired records according to retention matrix are archived to cold storage,
    SHA-256 manifests are generated, minimal trace receipts are preserved, and data purged.
    """
    archive_engine = HistoryArchiveEngine(
        storage_dir=temp_archive_dir,
        retention_matrix=retention_matrix,
    )

    now = datetime.now(UTC)
    old_date = now - timedelta(days=120)  # > 90 days audit retention limit

    mock_audit_records = [
        {
            "tenant_id": "tenant-001",
            "workspace_id": "workspace-001",
            "event_id": f"evt-{i}",
            "request_id": f"req-{i}",
            "actor_id": "user-1",
            "actor_type": "user",
            "operation": "QUERY",
            "result": "succeeded",
            "attributes": {"detail": "audit log"},
            "occurred_at": old_date.isoformat(),
        }
        for i in range(5)
    ]

    # Run archive and purge for AUDIT_EVENT
    manifest, receipt = archive_engine.execute_archive_and_purge(
        data_class=DataClass.AUDIT_EVENT,
        records=mock_audit_records,
        now=now,
    )

    assert manifest.status == "COMPLETED"
    assert manifest.archived_count == 5
    assert manifest.checksum_sha256 != ""
    assert Path(manifest.archive_filepath).exists()

    # Check receipt preserves minimal trace references
    assert receipt.tenant_id == "tenant-001"
    assert receipt.data_class == DataClass.AUDIT_EVENT
    assert receipt.purged_count == 5
    assert len(receipt.min_trace_references) == 5
    assert receipt.min_trace_references[0]["event_id"] == "evt-0"
    # Ensure sensitive payload attributes are NOT kept in minimal trace
    assert "attributes" not in receipt.min_trace_references[0]


def test_archived_history_async_audited_query(temp_archive_dir: Path) -> None:
    """
    Test async, controlled, auto-audited access to archived history records.
    Requires actor, tenant, purpose and creates audit_access_event log.
    """
    query_engine = ArchivedHistoryQueryEngine(storage_dir=temp_archive_dir)

    # Seed mock archived archive file
    archive_payload = [
        {
            "tenant_id": "tenant-001",
            "workspace_id": "workspace-001",
            "event_id": "evt-archived-1",
            "actor_id": "user-archived",
            "operation": "MODEL_CALL",
            "occurred_at": "2026-01-01T10:00:00Z",
        }
    ]
    archive_file = temp_archive_dir / "archive_audit_event_20260101.jsonl"
    archive_file.write_text(json.dumps(archive_payload[0]) + "\n", encoding="utf-8")

    # Purpose check: short purpose (<3 chars) must be rejected
    with pytest.raises(ValueError, match="PURPOSE_TOO_SHORT"):
        query_engine.submit_async_query(
            ArchivedQueryRequest(
                tenant_id="tenant-001",
                workspace_id="workspace-001",
                actor_id="operator-1",
                purpose="hi",  # Too short
                data_class=DataClass.AUDIT_EVENT,
                query_from=datetime(2026, 1, 1, tzinfo=UTC),
                query_to=datetime(2026, 1, 2, tzinfo=UTC),
            )
        )

    # Submit valid async query
    req = ArchivedQueryRequest(
        tenant_id="tenant-001",
        workspace_id="workspace-001",
        actor_id="operator-1",
        purpose="Compliance investigation for Q1 audit",
        data_class=DataClass.AUDIT_EVENT,
        query_from=datetime(2026, 1, 1, tzinfo=UTC),
        query_to=datetime(2026, 1, 2, tzinfo=UTC),
    )

    query_id = query_engine.submit_async_query(req)
    assert query_id != ""

    result = query_engine.get_query_result(query_id)
    assert isinstance(result, ArchivedQueryResult)
    assert result.status == "COMPLETED"
    assert result.audit_access_event_id != ""
    assert len(result.records) == 1
    assert result.records[0]["event_id"] == "evt-archived-1"


def test_api_history_retention_endpoints(
    temp_archive_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """
    Test REST API endpoints for history retention, partition check, archive run, and query.
    """
    app = create_app()
    client = TestClient(app)

    # 1. GET retention matrix
    res = client.get("/v1/history/retention/matrix")
    assert res.status_code == 200
    assert "AUDIT_EVENT" in res.json()["policies"]

    # 2. POST check and create partitions
    res = client.post(
        "/v1/history/partition/check-and-create",
        json={"table_name": "audit_event", "months_ahead": 2},
    )
    assert res.status_code == 200
    assert "partitions" in res.json()

    # 3. POST run archive job
    res = client.post(
        "/v1/history/archive/run",
        json={
            "data_class": "AUDIT_EVENT",
            "records": [
                {
                    "tenant_id": "tenant-001",
                    "event_id": "e-1",
                    "occurred_at": "2025-01-01T00:00:00Z",
                }
            ],
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"
    assert "checksum_sha256" in res.json()

    # 4. POST submit async archived query
    res = client.post(
        "/v1/history/archive/query",
        json={
            "tenant_id": "tenant-001",
            "workspace_id": "workspace-001",
            "actor_id": "operator-1",
            "purpose": "Auditing historical logs for compliance",
            "data_class": "AUDIT_EVENT",
            "query_from": "2025-01-01T00:00:00Z",
            "query_to": "2025-01-02T00:00:00Z",
        },
    )
    assert res.status_code == 200
    query_id = res.json()["query_id"]

    # 5. GET async archived query result
    res_result = client.get(f"/v1/history/archive/query/{query_id}")
    assert res_result.status_code == 200
    assert res_result.json()["status"] == "COMPLETED"
    assert "audit_access_event_id" in res_result.json()
