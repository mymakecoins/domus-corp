from fastapi.testclient import TestClient
from domus_knowledge.main import app

client = TestClient(app)

def test_quality_loop_feedback_flow():
    payload = {
        "tenant_id": "tenant-test",
        "workspace_id": "ws-1",
        "user_id": "user-1",
        "target_id": "res-123",
        "target_type": "response",
        "feedback_type": "error",
        "comment": "Informação divergente da norma V2."
    }
    response = client.post("/v1/quality-loop/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_id"] == "res-123"

    sug_res = client.get("/v1/quality-loop/suggestions?tenant_id=tenant-test")
    assert sug_res.status_code == 200
    sug_list = sug_res.json()
    assert len(sug_list) >= 1
    sug_id = sug_list[0]["id"]

    res_resolve = client.post(f"/v1/quality-loop/suggestions/{sug_id}/resolve", json={
        "before_state": {"v": 1},
        "after_state": {"v": 2},
        "owner": "owner@domus.corp"
    })
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "resolved"

def test_knowledge_gap_endpoints_flow():
    logs = [
        {
            "tenant_id": "tenant-test",
            "workspace_id": "ws-1",
            "query": "Como solicitar reembolso internacional?",
            "semantic_state": "no_evidence",
            "confidence": 0.1
        }
    ]
    detect_res = client.post("/v1/knowledge-gaps/detect?tenant_id=tenant-test", json=logs)
    assert detect_res.status_code == 200
    gaps = detect_res.json()
    assert len(gaps) >= 1
    gap_id = gaps[0]["id"]

    patch_res = client.patch(f"/v1/knowledge-gaps/{gap_id}", json={
        "status": "in_review",
        "assigned_owner": "rh-owner@domus.corp"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["assigned_owner"] == "rh-owner@domus.corp"
