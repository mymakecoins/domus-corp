from fastapi.testclient import TestClient

from domus_knowledge.main import app

client = TestClient(app)

def test_intelligence_endpoints_flow():
    # 1. Detect Change (V1-507)
    res_c = client.post("/intelligence/changes/detect", json={
        "tenant_id": "t1",
        "workspace_id": "ws1",
        "source_id": "s1",
        "source_type": "policy",
        "before_content": "v1",
        "after_content": "v2 com regra de norma obrigatoria"
    })
    assert res_c.status_code == 200
    assert res_c.json()["change_type"] == "normative"

    # List Changes
    res_clist = client.get("/intelligence/changes?tenant_id=t1&workspace_id=ws1")
    assert res_clist.status_code == 200
    assert len(res_clist.json()) == 1

    # 2. Generate Briefing (V1-508)
    res_b = client.post("/intelligence/briefings/generate", json={
        "tenant_id": "t1",
        "workspace_id": "ws1",
        "user_id": "u1",
        "role": "diretoria"
    })
    assert res_b.status_code == 200
    assert res_b.json()["role"] == "diretoria"
    assert len(res_b.json()["changes_included"]) == 1

    # Update Briefing Preferences (Pause)
    res_pref = client.post("/intelligence/briefings/preferences", json={
        "tenant_id": "t1",
        "workspace_id": "ws1",
        "user_id": "u1",
        "is_paused": True
    })
    assert res_pref.status_code == 200
    assert res_pref.json()["is_paused"] is True

    # 3. Evaluate Insight (V1-509)
    res_i = client.post("/intelligence/insights/evaluate", json={
        "tenant_id": "t1",
        "workspace_id": "ws1",
        "signals": [{
            "rule_id": "r1",
            "value": 0.9,
            "title": "Alerta Critico de Compliance",
            "severity": "critical"
        }]
    })
    assert res_i.status_code == 200
    insights = res_i.json()
    assert len(insights) == 1
    assert insights[0]["status"] == "draft"
    insight_id = insights[0]["id"]

    # Review Insight
    res_rev = client.post(f"/intelligence/insights/{insight_id}/review", json={
        "status": "published",
        "reviewer": "Knowledge Owner"
    })
    assert res_rev.status_code == 200
    assert res_rev.json()["status"] == "published"

    # Submit Feedback
    res_fb = client.post(f"/intelligence/insights/{insight_id}/feedback", json={
        "user_id": "u1",
        "feedback_type": "false_positive",
        "comment": "Limiar muito sensivel"
    })
    assert res_fb.status_code == 200
    assert res_fb.json()["feedback_type"] == "false_positive"
