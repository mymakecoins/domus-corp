"""Tests for V1-803 Framework de avaliação de groundedness, citações e qualidade."""

import pytest
from fastapi.testclient import TestClient

from domus_knowledge.evals_framework import (
    EvaluationDataset,
    EvaluationItem,
    EvaluatorEngine,
    RegressionAnalyzer,
    SemanticState,
)
from domus_knowledge.main import app


@pytest.fixture
def sample_dataset() -> EvaluationDataset:
    return EvaluationDataset(
        dataset_id="ds-v1",
        version="1.0.0",
        items=[
            EvaluationItem(
                id="item-1",
                domain="finance",
                question="Qual o faturamento do Q3?",
                expected_sources=["doc-123#chunk-1"],
                expected_semantic_state=SemanticState.SUCCESS,
            ),
            EvaluationItem(
                id="item-2",
                domain="legal",
                question="Qual a cláusula de confidencialidade da empresa X?",
                expected_sources=[],
                expected_semantic_state=SemanticState.NO_EVIDENCE_FOUND,
                requires_limitation_notice=True,
            ),
        ],
    )


def test_evaluator_engine_metrics_calculation(sample_dataset: EvaluationDataset) -> None:
    engine = EvaluatorEngine()
    
    responses = [
        {
            "item_id": "item-1",
            "retrieved_sources": ["doc-123#chunk-1", "doc-999#chunk-2"],
            "citations": ["doc-123#chunk-1"],
            "generated_text": "O faturamento foi R$ 10 milhões conforme doc-123#chunk-1.",
            "grounded_claims": ["O faturamento foi R$ 10 milhões"],
            "total_claims": ["O faturamento foi R$ 10 milhões"],
            "semantic_state": "SUCCESS",
            "declared_limitation": False,
            "latency_ms": 120.0,
            "cost_usd": 0.002,
        },
        {
            "item_id": "item-2",
            "retrieved_sources": [],
            "citations": [],
            "generated_text": "Não foram encontradas evidências nas fontes disponíveis para essa consulta.",
            "grounded_claims": [],
            "total_claims": [],
            "semantic_state": "NO_EVIDENCE_FOUND",
            "declared_limitation": True,
            "latency_ms": 80.0,
            "cost_usd": 0.001,
        },
    ]

    report = engine.evaluate_dataset(sample_dataset, responses, k=2)

    assert report.total_items == 2
    assert report.recall_at_k == pytest.approx(1.0)
    assert report.evidence_precision == pytest.approx(0.75)
    assert report.citation_validity == pytest.approx(1.0)
    assert report.groundedness == pytest.approx(1.0)
    assert report.absence_of_evidence_compliance == pytest.approx(1.0)
    assert report.avg_latency_ms == pytest.approx(100.0)
    assert report.total_cost_usd == pytest.approx(0.003)


def test_absence_of_evidence_validation_fails_without_limitation_notice() -> None:
    engine = EvaluatorEngine()
    
    dataset = EvaluationDataset(
        dataset_id="ds-v1",
        version="1.0.0",
        items=[
            EvaluationItem(
                id="item-2",
                domain="legal",
                question="Qual o contrato secreto?",
                expected_sources=[],
                expected_semantic_state=SemanticState.NO_EVIDENCE_FOUND,
                requires_limitation_notice=True,
            )
        ],
    )

    # Response missing limitation notice / wrong state
    responses = [
        {
            "item_id": "item-2",
            "retrieved_sources": [],
            "citations": [],
            "generated_text": "O contrato prevê cláusula penal de 10%.",  # Alucinação sem fonte
            "grounded_claims": [],
            "total_claims": ["O contrato prevê cláusula penal de 10%"],
            "semantic_state": "SUCCESS",
            "declared_limitation": False,
            "latency_ms": 90.0,
            "cost_usd": 0.001,
        }
    ]

    report = engine.evaluate_dataset(dataset, responses)
    assert report.absence_of_evidence_compliance == pytest.approx(0.0)
    assert report.item_results[0].passed is False


def test_regression_analyzer(sample_dataset: EvaluationDataset) -> None:
    analyzer = RegressionAnalyzer()
    
    baseline_metrics = {
        "overall_groundedness": 0.95,
        "domains": {
            "finance": {"recall_at_k": 1.0, "groundedness": 0.95},
            "legal": {"recall_at_k": 0.8, "groundedness": 0.90},
        },
        "semantic_states": {
            "SUCCESS": 0.95,
            "NO_EVIDENCE_FOUND": 1.0,
        },
    }

    candidate_metrics = {
        "overall_groundedness": 0.85,
        "domains": {
            "finance": {"recall_at_k": 1.0, "groundedness": 0.95},
            "legal": {"recall_at_k": 0.5, "groundedness": 0.70},
        },
        "semantic_states": {
            "SUCCESS": 0.85,
            "NO_EVIDENCE_FOUND": 0.5,
        },
    }

    comparison = analyzer.compare_runs(
        baseline_version="v1.0",
        candidate_version="v1.1-experiment",
        baseline=baseline_metrics,
        candidate=candidate_metrics,
        threshold_delta=0.05,
    )

    assert comparison.has_regression is True
    assert "legal" in comparison.regressions_by_domain
    assert "NO_EVIDENCE_FOUND" in comparison.regressions_by_semantic_state


def test_api_evals_endpoints() -> None:
    client = TestClient(app)

    # Benchmark run endpoint test
    response = client.post(
        "/api/v1/evals/benchmark",
        json={
            "dataset_id": "ds-v1",
            "dataset_version": "1.0.0",
            "model_version": "gpt-4o-2026-05",
            "prompt_version": "v2.1",
            "items": [
                {
                    "id": "i1",
                    "domain": "finance",
                    "question": "Lucro líquido?",
                    "expected_sources": ["doc-1#chunk-1"],
                    "expected_semantic_state": "SUCCESS",
                }
            ],
            "responses": [
                {
                    "item_id": "i1",
                    "retrieved_sources": ["doc-1#chunk-1"],
                    "citations": ["doc-1#chunk-1"],
                    "generated_text": "Lucro foi 1M.",
                    "grounded_claims": ["Lucro foi 1M"],
                    "total_claims": ["Lucro foi 1M"],
                    "semantic_state": "SUCCESS",
                    "declared_limitation": False,
                    "latency_ms": 100.0,
                    "cost_usd": 0.001,
                }
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "recall_at_k" in data
    assert data["total_items"] == 1

    # Compare endpoint
    compare_resp = client.post(
        "/api/v1/evals/compare",
        json={
            "baseline_version": "v1.0",
            "candidate_version": "v1.1",
            "baseline": {
                "overall_groundedness": 0.90,
                "domains": {"finance": {"recall_at_k": 0.9, "groundedness": 0.9}},
                "semantic_states": {"SUCCESS": 0.9},
            },
            "candidate": {
                "overall_groundedness": 0.70,
                "domains": {"finance": {"recall_at_k": 0.6, "groundedness": 0.7}},
                "semantic_states": {"SUCCESS": 0.7},
            },
        },
    )
    assert compare_resp.status_code == 200
    comp_data = compare_resp.json()
    assert comp_data["has_regression"] is True
