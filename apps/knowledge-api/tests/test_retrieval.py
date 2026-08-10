from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from domus_knowledge.access_control import (
    AuthorizedKnowledgeFilter,
    build_authorized_filter,
    derive_access_context,
)
from domus_knowledge.retrieval import RetrievalError, decode_cursor, hybrid_search


def filt() -> AuthorizedKnowledgeFilter:
    return build_authorized_filter(
        derive_access_context(
            {
                "tenant_id": "t",
                "workspace_id": "w",
                "user_id": "u",
                "policy_version": "p",
                "expires_at": datetime.now(UTC) + timedelta(minutes=1),
                "classification": "INTERNAL",
                "allowed_sources": ["s"],
                "allowed_assets": ["a"],
                "allowed_classifications": ["PUBLIC", "INTERNAL"],
            },
            request_id="r",
            trace_id="tr",
        )
    )


def row(chunk: str = "c1", tenant: str = "t") -> dict[str, Any]:
    return {
        "payload": {
            "tenant_id": tenant,
            "workspace_id": "w",
            "source_id": "s",
            "asset_id": "a",
            "classification": "INTERNAL",
            "governance_state": "EFFECTIVE",
            "safety_decision": "ALLOW_WITH_MARKERS",
            "index_version": "v1",
            "policy_version": "p",
            "chunk_id": chunk,
            "version_id": "v",
            "locator": "page:1",
            "evidence_ids": ["e"],
            "checksum": "sha256:" + "a" * 64,
            "freshness": "FRESH",
            "lexical_terms": "revenue growth",
            "vector_score": 0.9,
        }
    }


def test_hybrid_search_filters_before_ranking_and_returns_citations_only() -> None:
    page = hybrid_search(
        query="revenue", authorized_filter=filt(), records=[row(), row("bad", "other")]
    )
    assert len(page.results) == 1 and page.results[0].citation.chunk_id == "c1"
    assert not hasattr(page.results[0].citation, "content")


def test_cursor_and_limits_fail_closed() -> None:
    with pytest.raises(RetrievalError):
        hybrid_search(query="x", authorized_filter=filt(), records=[], limit=51)
    with pytest.raises(RetrievalError):
        decode_cursor("not-a-cursor")
