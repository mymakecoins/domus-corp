from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from domus_knowledge.main import app

client = TestClient(app)


def test_intelligence_query_returns_semantic_state():
    payload = {
        "query": "Qual a política de reembolso?",
        "user_roles": ["finance"],
        "evidences": [
            {"source_id": "pol-01", "content": "Reembolso até R$ 100", "required_role": "finance"}
        ],
    }

    mock_gateway_response = {
        "id": "resp-123",
        "output": {"content": "O reembolso máximo é R$ 100."},
    }

    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_gateway_response
        response = client.post("/intelligence/query", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "semantic_state" in data
    assert data["semantic_state"] == "fundamentada"
    assert "semantic_metadata" in data
    assert data["semantic_metadata"]["tone"] == "success"
    assert data["semantic_metadata"]["label"] == "Resposta Fundamentada"
