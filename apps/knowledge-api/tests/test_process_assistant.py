from unittest.mock import AsyncMock

import pytest

from domus_knowledge.process_assistant import (
    ProcessAssistantEngine,
    ProcessAssistantResponse,
)
from domus_knowledge.semantic_state import SemanticState


@pytest.mark.anyio
async def test_process_query_success():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Etapa 1: Solicitar aprovação (Papel: Gestor, Entradas: Formulário). Exceção: Se orçamentos zerados. Ação: criar_ticket"
    }
    
    engine = ProcessAssistantEngine(gateway_client=mock_gateway)
    response = await engine.process_query(
        query="Como aprovar reembolso?",
        user_roles=["user"],
        evidences=[
            {
                "chunk_id": "c1",
                "source_id": "proc-01",
                "text": "Política de Reembolso v1",
                "required_role": "user",
                "owner": "Financeiro",
                "freshness": "valid",
            }
        ],
    )
    
    assert isinstance(response, ProcessAssistantResponse)
    assert response.owner == "Financeiro"
    assert response.semantic_state == SemanticState.GROUNDED.value
    assert len(response.steps) >= 1
    assert response.steps[0].step_number == 1
    assert "Gestor" in response.steps[0].roles
