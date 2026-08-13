from domus_knowledge.semantic_state import (
    SemanticState,
    SemanticStateEvaluator,
)


def test_evaluate_blocked():
    evaluator = SemanticStateEvaluator()
    res = evaluator.evaluate(query="Secret", evidences=[], model_output="", access_denied=True)
    assert res.state == SemanticState.BLOCKED
    assert res.metadata.tone == "danger"


def test_evaluate_no_evidence():
    evaluator = SemanticStateEvaluator()
    res = evaluator.evaluate(query="Algo desconhecido", evidences=[], model_output="Não encontrei nada.")
    assert res.state == SemanticState.NO_EVIDENCE
    assert res.metadata.tone == "muted"


def test_evaluate_conflicting():
    evaluator = SemanticStateEvaluator()
    evidences = [
        {"source_id": "doc1", "content": "Valor é 10", "has_conflict": True, "conflict_source_id": "doc2"},
        {"source_id": "doc2", "content": "Valor é 20", "has_conflict": True, "conflict_source_id": "doc1"},
    ]
    res = evaluator.evaluate(query="Qual o valor?", evidences=evidences, model_output="Existe um conflito.")
    assert res.state == SemanticState.CONFLICTING
    assert len(res.conflicting_sources) == 2


def test_evaluate_outdated():
    evaluator = SemanticStateEvaluator()
    evidences = [
        {"source_id": "doc_old", "content": "Regra antiga", "is_outdated": True}
    ]
    res = evaluator.evaluate(query="Qual a regra?", evidences=evidences, model_output="A regra antiga é X.")
    assert res.state == SemanticState.OUTDATED
    assert len(res.outdated_sources) == 1


def test_evaluate_grounded():
    evaluator = SemanticStateEvaluator()
    evidences = [
        {"source_id": "doc_valid", "content": "Regra vigente X.", "is_outdated": False}
    ]
    res = evaluator.evaluate(query="Qual a regra?", evidences=evidences, model_output="A regra é X.")
    assert res.state == SemanticState.GROUNDED
    assert res.metadata.tone == "success"
