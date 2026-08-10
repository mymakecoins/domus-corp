"""Bounded hybrid retrieval after authorization; results contain references, never content."""

from __future__ import annotations

import base64
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from .access_control import AccessError, AuthorizedKnowledgeFilter


class RetrievalError(RuntimeError):
    pass


@dataclass(frozen=True)
class Citation:
    chunk_id: str
    asset_id: str
    version_id: str
    source_id: str
    locator: str
    evidence_ids: tuple[str, ...]
    checksum: str
    freshness: str


@dataclass(frozen=True)
class RetrievalResult:
    citation: Citation
    score: float


@dataclass(frozen=True)
class RetrievalPage:
    results: tuple[RetrievalResult, ...]
    next_cursor: str | None


def encode_cursor(offset: int) -> str:
    if offset < 0:
        raise RetrievalError("RETRIEVAL_CURSOR_INVALID")
    return (
        base64.urlsafe_b64encode(json.dumps({"offset": offset}, separators=(",", ":")).encode())
        .decode()
        .rstrip("=")
    )


def decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        value = json.loads(base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
        offset = value["offset"]
        if not isinstance(offset, int) or offset < 0:
            raise ValueError
        return offset
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise RetrievalError("RETRIEVAL_CURSOR_INVALID") from None


def hybrid_search(
    *,
    query: str,
    authorized_filter: AuthorizedKnowledgeFilter,
    records: Sequence[Mapping[str, Any]],
    cursor: str | None = None,
    limit: int = 50,
) -> RetrievalPage:
    if not query.strip() or limit < 1 or limit > 50:
        raise RetrievalError("RETRIEVAL_QUERY_INVALID")
    required = {
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
    if set(authorized_filter.values) != required:
        raise AccessError()
    matches: list[RetrievalResult] = []
    terms = set(query.casefold().split())
    for row in records[:200]:
        payload = row.get("payload", {})
        if not (
            payload.get("tenant_id") == authorized_filter.values["tenant_id"]
            and payload.get("workspace_id") == authorized_filter.values["workspace_id"]
            and payload.get("source_id") in authorized_filter.values["source_ids"]
            and payload.get("asset_id") in authorized_filter.values["asset_ids"]
            and payload.get("classification") in authorized_filter.values["allowed_classifications"]
            and payload.get("governance_state") == "EFFECTIVE"
            and payload.get("safety_decision") == "ALLOW_WITH_MARKERS"
            and payload.get("index_version") == authorized_filter.values["index_version"]
            and payload.get("policy_version") == authorized_filter.values["policy_version"]
        ):
            continue
        lexical = len(terms & set(str(payload.get("lexical_terms", "")).casefold().split()))
        score = float(payload.get("vector_score", 0.0)) + lexical * 0.01
        matches.append(
            RetrievalResult(
                Citation(
                    str(payload["chunk_id"]),
                    str(payload["asset_id"]),
                    str(payload["version_id"]),
                    str(payload["source_id"]),
                    str(payload["locator"]),
                    tuple(str(x) for x in payload.get("evidence_ids", ())),
                    str(payload["checksum"]),
                    str(payload.get("freshness", "FRESH")),
                ),
                score,
            )
        )
    matches.sort(key=lambda item: (-item.score, item.citation.chunk_id))
    offset = decode_cursor(cursor)
    page = tuple(matches[offset : offset + limit])
    return RetrievalPage(
        page, encode_cursor(offset + limit) if offset + limit < len(matches) else None
    )
