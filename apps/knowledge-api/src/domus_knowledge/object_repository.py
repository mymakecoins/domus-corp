"""Transaction-scoped PostgreSQL metadata adapter without a driver dependency."""

from __future__ import annotations

import json
from typing import Any, Protocol
from uuid import uuid4

from .objects import ObjectIdentity, ObjectRecord


class Cursor(Protocol):
    def execute(self, sql: str, values: tuple[object, ...] = ()) -> None: ...
    def fetchone(self) -> tuple[Any, ...] | None: ...


class Connection(Protocol):
    def cursor(self) -> Cursor: ...
    def commit(self) -> None: ...
    def rollback(self) -> None: ...


class PostgresObjectRepository:
    def __init__(self, connection: Connection, request_id: str, actor_id: str, policy_version: str):
        self._connection = connection
        self._request_id = request_id
        self._actor_id = actor_id
        self._policy_version = policy_version

    def _scope(self, cursor: Cursor, identity: ObjectIdentity) -> None:
        cursor.execute(
            "SELECT set_config('app.current_tenant_id',%s,true),"
            "set_config('app.current_workspace_id',%s,true),"
            "set_config('app.current_user_id',%s,true)",
            (identity.tenant_id, identity.workspace_id, self._actor_id),
        )

    def find(self, identity: ObjectIdentity) -> ObjectRecord | None:
        cursor = self._connection.cursor()
        try:
            self._scope(cursor, identity)
            cursor.execute(
                "SELECT classification,media_type,size_bytes,checksum,bucket_key,object_key,"
                "object_version,retention_days,upper(state),created_at,version FROM "
                "knowledge_asset_version WHERE tenant_id=%s AND workspace_id=%s AND "
                "asset_id=%s AND version_id=%s",
                (identity.tenant_id, identity.workspace_id, identity.asset_id, identity.version_id),
            )
            row = cursor.fetchone()
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise
        if row is None:
            return None
        return ObjectRecord(
            identity,
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
            row[6],
            row[7],
            row[8],
            row[9].isoformat(),
            row[10],
        )

    def save_admission(self, record: ObjectRecord, event_type: str) -> None:
        cursor = self._connection.cursor()
        identity = record.identity
        try:
            self._scope(cursor, identity)
            cursor.execute(
                "INSERT INTO knowledge_asset(tenant_id,workspace_id,asset_id,source_id,owner_id,"
                "classification,media_type,retention_days,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT(tenant_id,workspace_id,asset_id) DO NOTHING",
                (
                    identity.tenant_id,
                    identity.workspace_id,
                    identity.asset_id,
                    identity.source_id,
                    identity.owner_id,
                    record.classification,
                    record.media_type,
                    record.retention_days,
                    record.created_at,
                ),
            )
            cursor.execute(
                "INSERT INTO knowledge_asset_version(tenant_id,workspace_id,asset_id,version_id,"
                "source_id,owner_id,classification,media_type,size_bytes,checksum,bucket_key,object_key,"
                "object_version,retention_days,state,policy_version,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    identity.tenant_id,
                    identity.workspace_id,
                    identity.asset_id,
                    identity.version_id,
                    identity.source_id,
                    identity.owner_id,
                    record.classification,
                    record.media_type,
                    record.size_bytes,
                    record.checksum,
                    record.bucket,
                    record.object_key,
                    record.object_version,
                    record.retention_days,
                    record.state.lower(),
                    self._policy_version,
                    record.created_at,
                ),
            )
            metadata = json.dumps({"status": record.state, "classification": record.classification})
            cursor.execute(
                "INSERT INTO knowledge_object_audit(tenant_id,workspace_id,audit_id,"
                "request_id,actor_id,asset_id,version_id,operation,attributes,occurred_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s)",
                (
                    identity.tenant_id,
                    identity.workspace_id,
                    str(uuid4()),
                    self._request_id,
                    self._actor_id,
                    identity.asset_id,
                    identity.version_id,
                    event_type,
                    metadata,
                    record.created_at,
                ),
            )
            cursor.execute(
                "INSERT INTO knowledge_object_outbox(tenant_id,workspace_id,event_id,"
                "event_type,request_id,asset_id,version_id,source_id,classification,state,"
                "checksum,item_size_bytes,occurred_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    identity.tenant_id,
                    identity.workspace_id,
                    str(uuid4()),
                    event_type,
                    self._request_id,
                    identity.asset_id,
                    identity.version_id,
                    identity.source_id,
                    record.classification,
                    record.state.lower(),
                    record.checksum,
                    record.size_bytes,
                    record.created_at,
                ),
            )
            self._connection.commit()
        except Exception:
            self._connection.rollback()
            raise
