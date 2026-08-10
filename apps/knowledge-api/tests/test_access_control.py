from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from domus_knowledge.access_control import (
    AccessError,
    QdrantDouble,
    bounded_traverse,
    build_authorized_filter,
    derive_access_context,
    transaction_scope,
)

NOW = datetime.now(UTC)


def policy(**overrides: Any) -> dict[str, Any]:
    p = {
        "tenant_id": "t1",
        "workspace_id": "w1",
        "user_id": "u1",
        "policy_version": "p1",
        "expires_at": NOW + timedelta(minutes=5),
        "classification": "CONFIDENTIAL",
        "allowed_sources": ["s1"],
        "allowed_assets": ["a1"],
        "allowed_classifications": ["PUBLIC", "INTERNAL", "CONFIDENTIAL"],
    }
    p.update(overrides)
    return p


def context() -> Any:
    return derive_access_context(policy(), now=NOW, request_id="r1", trace_id="tr1")


def test_context_is_server_derived_and_expiry_fail_closed() -> None:
    assert context().tenant_id == "t1"
    with pytest.raises(AccessError):
        derive_access_context(policy(expires_at=NOW), now=NOW, request_id="r1", trace_id="tr1")
    with pytest.raises(AccessError):
        derive_access_context(
            policy(), now=NOW, declared_workspace_id="evil", request_id="r1", trace_id="tr1"
        )


def test_filter_requires_bounded_scope_and_qdrant_never_returns_other_scope() -> None:
    f = build_authorized_filter(context())
    q = QdrantDouble(
        [
            {
                "id": "ok",
                "payload": {
                    "tenant_id": "t1",
                    "workspace_id": "w1",
                    "source_id": "s1",
                    "asset_id": "a1",
                    "classification": "CONFIDENTIAL",
                    "governance_state": "EFFECTIVE",
                    "safety_decision": "ALLOW_WITH_MARKERS",
                    "index_version": "v1",
                    "policy_version": "p1",
                },
            },
            {
                "id": "no",
                "payload": {
                    "tenant_id": "t2",
                    "workspace_id": "w1",
                    "source_id": "s1",
                    "asset_id": "a1",
                    "classification": "CONFIDENTIAL",
                    "governance_state": "EFFECTIVE",
                    "safety_decision": "ALLOW_WITH_MARKERS",
                    "index_version": "v1",
                    "policy_version": "p1",
                },
            },
        ]
    )
    assert q.search(f) == ("ok",)
    with pytest.raises(AccessError):
        build_authorized_filter(
            derive_access_context(policy(allowed_assets=[]), now=NOW, request_id="r", trace_id="t")
        )


def test_transaction_scope_sets_local_context_and_rolls_back() -> None:
    class Conn:
        def __init__(self) -> None:
            self.sql: list[tuple[str, tuple[Any, ...]]] = []

        def execute(self, sql: str, *args: Any) -> None:
            self.sql.append((sql, args))

    c = Conn()
    with transaction_scope(c, context()):
        pass
    assert c.sql[0][0] == "BEGIN" and c.sql[-1][0] == "COMMIT"
    assert all(args[-1] is True for sql, args in c.sql[1:-1])


def test_traversal_is_bounded() -> None:
    assert bounded_traverse({"a": ["b"], "b": ["c"]}, ["a"]) == ("a", "b", "c")
    with pytest.raises(AccessError):
        bounded_traverse({"a": [str(i) for i in range(51)]}, ["a"])
