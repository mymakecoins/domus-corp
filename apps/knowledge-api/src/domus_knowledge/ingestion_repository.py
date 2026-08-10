"""Transaction-scoped PostgreSQL adapter for V1-404 ingestion metadata."""

from __future__ import annotations

from typing import Any, Protocol
from uuid import uuid4

from .ingestion import IngestionJob, IngestionResult


class Cursor(Protocol):
    def execute(self, sql: str, values: tuple[object, ...] = ()) -> None: ...
    def fetchone(self) -> tuple[Any, ...] | None: ...


class Connection(Protocol):
    def cursor(self) -> Cursor: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...


class PostgresIngestionRepository:
    def __init__(self, connection: Connection):
        self._connection = connection

    def _scope(self, cursor: Cursor, job: IngestionJob) -> None:
        cursor.execute(
            "SELECT set_config('app.current_tenant_id',%s,true),"
            "set_config('app.current_workspace_id',%s,true)",
            (job.tenant_id, job.workspace_id),
        )

    def find(self, key: tuple[str, str, str, str, str]) -> tuple[str, IngestionResult] | None:
        tenant, workspace, version_id, profile, parser_version = key
        cursor = self._connection.cursor()
        try:
            cursor.execute(
                "SELECT set_config('app.current_tenant_id',%s,true),"
                "set_config('app.current_workspace_id',%s,true)",
                (tenant, workspace),
            )
            cursor.execute(
                "SELECT job_id,state,original_checksum,normalized_checksum,artifact_key "
                "FROM knowledge_ingestion_job WHERE tenant_id=%s AND workspace_id=%s AND "
                "asset_version_id=%s AND parser_profile=%s AND parser_version=%s",
                key,
            )
            row = cursor.fetchone()
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise
        if row is None or row[1].upper() != "SUCCEEDED":
            return None
        return row[2], IngestionResult(str(row[0]), "SUCCEEDED", None)

    def begin(self, job: IngestionJob) -> None:
        cursor = self._connection.cursor()
        try:
            self._scope(cursor, job)
            cursor.execute(
                "INSERT INTO knowledge_ingestion_job(tenant_id,workspace_id,job_id,asset_id,"
                "asset_version_id,request_id,trace_id,policy_version,parser_profile,parser_version,"
                "original_checksum,fencing_token,state,created_at,updated_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'running',now(),now()) "
                "ON CONFLICT(tenant_id,workspace_id,asset_version_id,parser_profile,"
                "parser_version) DO UPDATE SET fencing_token=EXCLUDED.fencing_token,"
                "state='running',updated_at=now() "
                "WHERE knowledge_ingestion_job.fencing_token<EXCLUDED.fencing_token",
                (
                    job.tenant_id,
                    job.workspace_id,
                    job.job_id,
                    job.asset_id,
                    job.asset_version_id,
                    job.request_id,
                    job.trace_id,
                    job.policy_version,
                    job.parser_profile,
                    job.parser_version,
                    job.original_checksum,
                    job.fencing_token,
                ),
            )
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise

    def succeed(self, job: IngestionJob, result: IngestionResult) -> None:
        if result.manifest is None:
            raise ValueError("OUTPUT_INVALID")
        manifest = result.manifest
        cursor = self._connection.cursor()
        try:
            self._scope(cursor, job)
            cursor.execute(
                "UPDATE knowledge_ingestion_job SET state='succeeded',normalized_checksum=%s,"
                "artifact_key=%s,artifact_size_bytes=%s,language=%s,unit_count=%s,updated_at=now() "
                "WHERE tenant_id=%s AND workspace_id=%s AND job_id=%s AND fencing_token=%s "
                "AND state='running'",
                (
                    manifest.normalized_checksum,
                    manifest.artifact_key,
                    manifest.size_bytes,
                    manifest.language,
                    len(manifest.units),
                    job.tenant_id,
                    job.workspace_id,
                    job.job_id,
                    job.fencing_token,
                ),
            )
            cursor.execute(
                "INSERT INTO knowledge_ingestion_outbox(tenant_id,workspace_id,event_id,event_type,"
                "request_id,job_id,asset_id,asset_version_id,parser_version,state,original_checksum,"
                "normalized_checksum,occurred_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,"
                "%s,%s,now())",
                (
                    job.tenant_id,
                    job.workspace_id,
                    str(uuid4()),
                    "knowledge.ingestion.succeeded.v1",
                    job.request_id,
                    job.job_id,
                    job.asset_id,
                    job.asset_version_id,
                    job.parser_version,
                    "succeeded",
                    job.original_checksum,
                    manifest.normalized_checksum,
                ),
            )
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise
