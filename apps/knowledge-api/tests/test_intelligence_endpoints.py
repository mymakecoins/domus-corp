from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from domus_knowledge.main import app
from domus_knowledge.model_gateway_client import ModelGatewayError


def test_health_check_remains_ok():
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    # Allow uppercase or lowercase "ok" / "OK"
    assert response.json()["status"].lower() == "ok"


def test_orchestrate_endpoint_requires_payload():
    client = TestClient(app)
    response = client.post("/v1/intelligence/orchestrate", json={})
    assert response.status_code in (422, 400)


def test_orchestrate_endpoint_success():
    client = TestClient(app)
    payload = {
        "query": "Qual a regra de segurança?",
        "user_roles": ["user"],
        "evidences": [{"chunk_id": "c1", "content": "Regra X"}],
        "max_tokens": 500,
    }
    mock_gateway_response = {
        "id": "resp-123",
        "output": {"content": "Resposta baseada em Regra X"},
    }

    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = mock_gateway_response
        response = client.post("/v1/intelligence/orchestrate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "orchestration" in data
    assert "gateway_result" in data
    assert data["gateway_result"] == mock_gateway_response
    assert data["orchestration"]["authorized_chunk_count"] == 1


def test_orchestrate_endpoint_gateway_error():
    client = TestClient(app)
    payload = {
        "query": "Qual a regra de segurança?",
        "user_roles": ["user"],
        "evidences": [],
    }

    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.side_effect = ModelGatewayError("Gateway timeout")
        response = client.post("/v1/intelligence/orchestrate", json=payload)

    assert response.status_code == 502
    assert "Gateway timeout" in response.json()["detail"]
