import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from domus_knowledge.main import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

def test_process_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Passo 1: Enviar formulário ao RH."}
        payload = {
            "query": "Como solicitar férias?",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "policy-rh", "text": "Regra de Férias", "owner": "RH"}],
        }
        res = client.post("/v1/intelligence/process", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "steps" in data
        assert data["owner"] == "RH"
        assert "semantic_state" in data

def test_synthesis_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Síntese dos dados corporativos."}
        payload = {
            "query": "Sintetizar relatórios",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "rep-1", "text": "Relatório Anual"}],
        }
        res = client.post("/v1/intelligence/synthesis", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "facts" in data

def test_compare_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Recomendação técnica: Opção 1."}
        payload = {
            "query": "Comparar Fornecedor A e B",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "doc-1", "text": "Proposta A e B"}],
            "alternatives": ["Fornecedor A", "Fornecedor B"],
        }
        res = client.post("/v1/intelligence/compare", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_recommendation_only"] is True
        assert "alternatives" in data
