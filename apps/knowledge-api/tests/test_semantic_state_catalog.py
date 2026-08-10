import pytest
from domus_knowledge.semantic_state import (
    SemanticState,
    SemanticStateCatalog,
    SemanticStateMetadata,
)


def test_catalog_contains_all_eight_states():
    expected_states = {
        "fundamentada",
        "parcial",
        "conflitante",
        "sem-evidencia",
        "inferida",
        "recomendacao",
        "obsoleta",
        "bloqueada",
    }
    catalog_states = {state.value for state in SemanticState}
    assert catalog_states == expected_states


def test_catalog_metadata_for_grounded():
    meta = SemanticStateCatalog.get_metadata(SemanticState.GROUNDED)
    assert meta.state == SemanticState.GROUNDED
    assert meta.label == "Resposta Fundamentada"
    assert meta.tone == "success"
    assert meta.icon == "CheckCircle"
    assert meta.next_action == "Inspecionar citações para detalhes."
