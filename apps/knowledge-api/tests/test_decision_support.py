from unittest.mock import AsyncMock

import pytest

from domus_knowledge.decision_support import (
    ComparisonResult,
    DecisionSupportEngine,
    SynthesisResult,
)
from domus_knowledge.semantic_state import SemanticState


@pytest.mark.anyio
async def test_synthesis_generation():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Fato: Faturamento cresceu 10%. Divergência: Relatório A diz 10% e B diz 12%. Lacuna: Dados de Q4 ausentes."
    }
    
    engine = DecisionSupportEngine(gateway_client=mock_gateway)
    synthesis = await engine.synthesize(
        query="Sintetizar relatórios financeiros",
        user_roles=["user"],
        evidences=[{"chunk_id": "c1", "source_id": "doc-01", "text": "Relatório Q3"}]
    )
    
    assert isinstance(synthesis, SynthesisResult)
    assert synthesis.summary != ""
    assert isinstance(synthesis.facts, list)
    assert isinstance(synthesis.divergences, list)
    assert isinstance(synthesis.gaps, list)
    assert synthesis.semantic_state == SemanticState.GROUNDED.value

@pytest.mark.anyio
async def test_comparison_generation_labeled_as_recommendation():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Alternativa A: Servidor Local. Premissas: Infra própria. Riscos: Custo fixo. Recomendação: Opção B."
    }
    
    engine = DecisionSupportEngine(gateway_client=mock_gateway)
    comparison = await engine.compare(
        query="Comparar Nuvem vs On-Premise",
        user_roles=["user"],
        evidences=[{"chunk_id": "c1", "source_id": "doc-01", "text": "Estudo de Nuvem"}],
        alternatives=["Nuvem", "On-Premise"]
    )
    
    assert isinstance(comparison, ComparisonResult)
    assert comparison.is_recommendation_only is True
    assert comparison.semantic_state == SemanticState.RECOMMENDATION.value
    assert len(comparison.alternatives) >= 1
