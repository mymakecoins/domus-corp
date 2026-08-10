"""Fail-closed authorization context and pre-retrieval filters for Knowledge Fabric."""

from __future__ import annotations

import json
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

LEVEL = {"PUBLIC": 0, "INTERNAL": 1, "CONFIDENTIAL": 2, "RESTRICTED": 3}
REQUIRED_FILTER_KEYS = frozenset(
    {
        "tenant_id",
        "workspace_id",
        "source_ids",
        "asset_ids",
        "allowed_classifications",
        "classification",
        "governance_state",
        "safety_decision",
        "index_version",
        "policy_version",
    }
)


class AccessError(PermissionError):
    """Uniform denial; callers must not disclose which predicate failed."""

    def __init__(self, code: str = "KNOWLEDGE_ACCESS_DENIED") -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class KnowledgeAccessContext:
    tenant_id: str
    workspace_id: str
    user_id: str
    allowed_sources: tuple[str, ...]
    allowed_assets: tuple[str, ...]
    allowed_classifications: tuple[str, ...]
    classification: str
    policy_version: str
    request_id: str
    trace_id: str
    purpose: str
    expires_at: datetime


@dataclass(frozen=True)
class AuthorizedKnowledgeFilter:
    values: Mapping[str, Any]


@dataclass(frozen=True)
class AccessDecision:
    allowed: bool
    reason_code: str = "ALLOWED"
    candidate_count: int = 0
    returned_count: int = 0


def derive_access_context(
    policy: Mapping[str, Any],
    *,
    now: datetime | None = None,
    declared_workspace_id: str | None = None,
    declared_user_id: str | None = None,
    request_id: str = "",
    trace_id: str = "",
    purpose: str = "knowledge.query",
) -> KnowledgeAccessContext:
    now = now or datetime.now(UTC)
    try:
        tenant, workspace, user = (
            str(policy["tenant_id"]),
            str(policy["workspace_id"]),
            str(policy["user_id"]),
        )
        version, expires = str(policy["policy_version"]), policy["expires_at"]
        classification = str(policy["classification"]).upper()
        sources = tuple(sorted({str(x) for x in policy["allowed_sources"]}))
        assets = tuple(sorted({str(x) for x in policy.get("allowed_assets", ())}))
        classes = tuple(
            sorted(
                {str(x).upper() for x in policy.get("allowed_classifications", (classification,))},
                key=lambda item: LEVEL[item],
            )
        )
        expiry = (
            expires
            if isinstance(expires, datetime)
            else datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise AccessError() from exc
    if (declared_workspace_id is not None or declared_user_id is not None) and (
        declared_workspace_id != workspace or declared_user_id != user
    ):
        raise AccessError()
    if (
        not version
        or not tenant
        or not workspace
        or not user
        or not request_id
        or not trace_id
        or expiry <= now
        or classification not in LEVEL
    ):
        raise AccessError()
    if (
        len(sources) > 1000
        or len(assets) > 1000
        or not sources
        or not classes
        or any(x not in LEVEL for x in classes)
    ):
        raise AccessError()
    if LEVEL[classification] > max(LEVEL[x] for x in classes):
        raise AccessError()
    return KnowledgeAccessContext(
        tenant,
        workspace,
        user,
        sources,
        assets,
        classes,
        classification,
        version,
        request_id,
        trace_id,
        purpose,
        expiry,
    )


def build_authorized_filter(
    context: KnowledgeAccessContext,
    *,
    index_version: str = "v1",
    governance_state: str = "EFFECTIVE",
    safety_decision: str = "ALLOW_WITH_MARKERS",
) -> AuthorizedKnowledgeFilter:
    if (
        context.expires_at <= datetime.now(UTC)
        or not context.allowed_sources
        or not context.allowed_assets
    ):
        raise AccessError()
    values = {
        "tenant_id": context.tenant_id,
        "workspace_id": context.workspace_id,
        "source_ids": list(context.allowed_sources),
        "asset_ids": list(context.allowed_assets),
        "allowed_classifications": list(context.allowed_classifications),
        "classification": context.classification,
        "governance_state": governance_state,
        "safety_decision": safety_decision,
        "index_version": index_version,
        "policy_version": context.policy_version,
    }
    if len(json.dumps(values, separators=(",", ":"), sort_keys=True)) > 64 * 1024:
        raise AccessError()
    return AuthorizedKnowledgeFilter(values)


class _Connection(Protocol):
    def execute(self, sql: str, *args: Any) -> Any: ...


@contextmanager
def transaction_scope(connection: _Connection, context: KnowledgeAccessContext) -> Iterator[None]:
    connection.execute("BEGIN")
    try:
        for key, value in (
            ("app.current_tenant_id", context.tenant_id),
            ("app.current_workspace_id", context.workspace_id),
            ("app.current_user_id", context.user_id),
            ("app.current_classification", context.classification),
            ("app.current_policy_version", context.policy_version),
        ):
            connection.execute("SELECT set_config(%s, %s, %s)", key, value, True)
        yield
    except Exception:
        connection.execute("ROLLBACK")
        raise
    else:
        connection.execute("COMMIT")


class QdrantDouble:
    def __init__(self, records: Sequence[Mapping[str, Any]]) -> None:
        self.records = tuple(records)

    def search(self, authorized: AuthorizedKnowledgeFilter) -> tuple[str, ...]:
        f = authorized.values
        if set(f) != REQUIRED_FILTER_KEYS or not f["source_ids"] or not f["asset_ids"]:
            raise AccessError()
        out: list[str] = []
        for row in self.records:
            p = row.get("payload", {})
            if (
                all(
                    p.get(k) == f[k]
                    for k in (
                        "tenant_id",
                        "workspace_id",
                        "governance_state",
                        "safety_decision",
                        "index_version",
                        "policy_version",
                    )
                )
                and p.get("source_id") in f["source_ids"]
                and p.get("asset_id") in f["asset_ids"]
                and p.get("classification") in f["allowed_classifications"]
            ):
                out.append(str(row["id"]))
        return tuple(out[:50])


def bounded_traverse(
    graph: Mapping[str, Sequence[str]],
    roots: Sequence[str],
    *,
    max_hops: int = 2,
    max_edges_per_node: int = 50,
    max_rows: int = 500,
) -> tuple[str, ...]:
    if max_hops > 2 or max_edges_per_node > 50 or max_rows > 500:
        raise AccessError()
    seen, frontier = set(roots), list(roots)
    for _ in range(max_hops):
        nxt: list[str] = []
        for node in frontier:
            edges = graph.get(node, ())
            if len(edges) > max_edges_per_node:
                raise AccessError()
            for target in edges:
                if target not in seen:
                    seen.add(target)
                    nxt.append(target)
                if len(seen) > max_rows:
                    raise AccessError()
        frontier = nxt
    return tuple(sorted(seen))
