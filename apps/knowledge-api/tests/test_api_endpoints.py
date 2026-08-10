from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient

from domus_knowledge.main import app

client = TestClient(app)


def valid_policy(**overrides: Any) -> dict[str, Any]:
    p = {
        "tenant_id": "t1",
        "workspace_id": "w1",
        "user_id": "u1",
        "policy_version": "p1",
        "expires_at": (datetime.now(UTC) + timedelta(minutes=10)).isoformat(),
        "classification": "CONFIDENTIAL",
        "allowed_sources": ["s1"],
        "allowed_assets": ["a1"],
        "allowed_classifications": ["PUBLIC", "INTERNAL", "CONFIDENTIAL"],
    }
    p.update(overrides)
    return p


def valid_record(chunk_id: str = "c1", tenant_id: str = "t1") -> dict[str, Any]:
    return {
        "payload": {
            "tenant_id": tenant_id,
            "workspace_id": "w1",
            "source_id": "s1",
            "asset_id": "a1",
            "classification": "CONFIDENTIAL",
            "governance_state": "EFFECTIVE",
            "safety_decision": "ALLOW_WITH_MARKERS",
            "index_version": "v1",
            "policy_version": "p1",
            "chunk_id": chunk_id,
            "version_id": "v1",
            "locator": "page:1",
            "evidence_ids": ["e1"],
            "checksum": "sha256:" + "a" * 64,
            "freshness": "FRESH",
            "lexical_terms": "revenue growth",
            "vector_score": 0.9,
        }
    }


def test_healthz_endpoint() -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}


def test_access_check_endpoint_denies_missing_context() -> None:
    response = client.post("/api/v1/knowledge/access-check", json={})
    assert response.status_code == 403
    assert response.json()["code"] == "KNOWLEDGE_ACCESS_DENIED"


def test_access_check_endpoint_allows_valid_policy() -> None:
    response = client.post("/api/v1/knowledge/access-check", json={"policy": valid_policy()})
    assert response.status_code == 200
    data = response.json()
    assert data["allowed"] is True
    assert data["filter"]["tenant_id"] == "t1"
    assert data["filter"]["workspace_id"] == "w1"


def test_search_endpoint_fails_closed_without_policy() -> None:
    response = client.post("/api/v1/knowledge/search", json={"query": "test"})
    assert response.status_code == 403
    assert response.json()["code"] == "KNOWLEDGE_ACCESS_DENIED"


def test_search_endpoint_returns_citations_for_valid_request() -> None:
    payload = {
        "policy": valid_policy(),
        "query": "revenue",
        "records": [valid_record("c1", "t1"), valid_record("c2", "other_tenant")],
    }
    response = client.post("/api/v1/knowledge/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 1
    assert data["results"][0]["chunk_id"] == "c1"
    assert data["results"][0]["asset_id"] == "a1"
