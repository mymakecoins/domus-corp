"""Framework de Avaliação de Groundedness, Citações, Qualidade e Regressão (V1-803)."""

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class SemanticState(str, Enum):
    SUCCESS = "SUCCESS"
    NO_EVIDENCE_FOUND = "NO_EVIDENCE_FOUND"
    PARTIAL_EVIDENCE = "PARTIAL_EVIDENCE"
    AMBIGUOUS_QUERY = "AMBIGUOUS_QUERY"
    POLICY_BLOCKED = "POLICY_BLOCKED"


class EvaluationItem(BaseModel):
    id: str
    domain: str
    question: str
    expected_sources: list[str] = Field(default_factory=list)
    expected_semantic_state: SemanticState = SemanticState.SUCCESS
    requires_limitation_notice: bool = False


class EvaluationDataset(BaseModel):
    dataset_id: str
    version: str
    items: list[EvaluationItem]


class EvaluationResponse(BaseModel):
    item_id: str
    retrieved_sources: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    generated_text: str = ""
    grounded_claims: list[str] = Field(default_factory=list)
    total_claims: list[str] = Field(default_factory=list)
    semantic_state: SemanticState = SemanticState.SUCCESS
    declared_limitation: bool = False
    latency_ms: float = 0.0
    cost_usd: float = 0.0


class ItemEvaluationResult(BaseModel):
    item_id: str
    domain: str
    recall_at_k: float
    evidence_precision: float
    citation_validity: float
    groundedness: float
    absence_compliance: float
    latency_ms: float
    cost_usd: float
    passed: bool


class EvaluationReport(BaseModel):
    dataset_id: str
    dataset_version: str
    model_version: str = "default"
    prompt_version: str = "default"
    total_items: int
    passed_items: int
    recall_at_k: float
    evidence_precision: float
    citation_validity: float
    groundedness: float
    absence_of_evidence_compliance: float
    avg_latency_ms: float
    total_cost_usd: float
    domain_metrics: dict[str, dict[str, float]] = Field(default_factory=dict)
    semantic_state_metrics: dict[str, dict[str, float]] = Field(default_factory=dict)
    item_results: list[ItemEvaluationResult] = Field(default_factory=list)


class EvaluatorEngine:
    """Calcula métricas de groundedness, citações e ausência de evidência sobre respostas."""

    def evaluate_dataset(
        self,
        dataset: EvaluationDataset,
        responses: list[dict[str, Any] | EvaluationResponse],
        k: int = 5,
        model_version: str = "default",
        prompt_version: str = "default",
    ) -> EvaluationReport:
        items_map = {item.id: item for item in dataset.items}
        resp_objects: list[EvaluationResponse] = []

        for r in responses:
            if isinstance(r, dict):
                resp_objects.append(EvaluationResponse(**r))
            else:
                resp_objects.append(r)

        resp_map = {r.item_id: r for r in resp_objects}
        item_results: list[ItemEvaluationResult] = []

        domain_scores: dict[str, list[dict[str, float]]] = {}
        state_scores: dict[str, list[dict[str, float]]] = {}

        for item_id, item in items_map.items():
            resp = resp_map.get(item_id, EvaluationResponse(item_id=item_id))
            
            # Recall@K & Evidence Precision
            retrieved_k = resp.retrieved_sources[:k]
            if item.expected_sources:
                hits = sum(1 for src in item.expected_sources if src in retrieved_k)
                recall = hits / len(item.expected_sources)
                precision = hits / len(retrieved_k) if retrieved_k else 0.0
            else:
                recall = 1.0 if not retrieved_k else 0.0
                precision = 1.0 if not retrieved_k else 0.0

            # Citation Validity
            if resp.citations:
                valid_cits = sum(
                    1 for c in resp.citations
                    if c in resp.retrieved_sources or c in item.expected_sources
                )
                citation_validity = valid_cits / len(resp.citations)
            else:
                citation_validity = 1.0

            # Groundedness
            if resp.total_claims:
                groundedness = len(resp.grounded_claims) / len(resp.total_claims)
            else:
                groundedness = 1.0

            # Absence of Evidence / Semantic state check
            absence_compliance = 1.0
            if item.expected_semantic_state == SemanticState.NO_EVIDENCE_FOUND or item.requires_limitation_notice:
                state_match = resp.semantic_state == item.expected_semantic_state
                limitation_match = resp.declared_limitation if item.requires_limitation_notice else True
                if not (state_match and limitation_match):
                    absence_compliance = 0.0

            passed = (
                recall >= 0.8
                and groundedness >= 0.8
                and citation_validity >= 0.8
                and absence_compliance == 1.0
            )

            res = ItemEvaluationResult(
                item_id=item_id,
                domain=item.domain,
                recall_at_k=recall,
                evidence_precision=precision,
                citation_validity=citation_validity,
                groundedness=groundedness,
                absence_compliance=absence_compliance,
                latency_ms=resp.latency_ms,
                cost_usd=resp.cost_usd,
                passed=passed,
            )
            item_results.append(res)

            # Group for aggregation
            metrics_dict = {
                "recall_at_k": recall,
                "evidence_precision": precision,
                "citation_validity": citation_validity,
                "groundedness": groundedness,
                "absence_compliance": absence_compliance,
            }

            domain_scores.setdefault(item.domain, []).append(metrics_dict)
            state_scores.setdefault(item.expected_semantic_state.value, []).append(metrics_dict)

        total_items = len(item_results)
        passed_items = sum(1 for r in item_results if r.passed)
        avg_recall = sum(r.recall_at_k for r in item_results) / total_items if total_items else 0.0
        avg_prec = sum(r.evidence_precision for r in item_results) / total_items if total_items else 0.0
        avg_cit = sum(r.citation_validity for r in item_results) / total_items if total_items else 0.0
        avg_ground = sum(r.groundedness for r in item_results) / total_items if total_items else 0.0
        avg_absence = sum(r.absence_compliance for r in item_results) / total_items if total_items else 0.0
        avg_lat = sum(r.latency_ms for r in item_results) / total_items if total_items else 0.0
        total_cost = sum(r.cost_usd for r in item_results)

        def aggregate_metrics(scores_dict: dict[str, list[dict[str, float]]]) -> dict[str, dict[str, float]]:
            aggregated = {}
            for key, score_list in scores_dict.items():
                count = len(score_list)
                aggregated[key] = {
                    "recall_at_k": sum(s["recall_at_k"] for s in score_list) / count,
                    "evidence_precision": sum(s["evidence_precision"] for s in score_list) / count,
                    "citation_validity": sum(s["citation_validity"] for s in score_list) / count,
                    "groundedness": sum(s["groundedness"] for s in score_list) / count,
                    "absence_compliance": sum(s["absence_compliance"] for s in score_list) / count,
                }
            return aggregated

        return EvaluationReport(
            dataset_id=dataset.dataset_id,
            dataset_version=dataset.version,
            model_version=model_version,
            prompt_version=prompt_version,
            total_items=total_items,
            passed_items=passed_items,
            recall_at_k=avg_recall,
            evidence_precision=avg_prec,
            citation_validity=avg_cit,
            groundedness=avg_ground,
            absence_of_evidence_compliance=avg_absence,
            avg_latency_ms=avg_lat,
            total_cost_usd=total_cost,
            domain_metrics=aggregate_metrics(domain_scores),
            semantic_state_metrics=aggregate_metrics(state_scores),
            item_results=item_results,
        )


class RegressionComparisonResult(BaseModel):
    baseline_version: str
    candidate_version: str
    has_regression: bool
    overall_delta: dict[str, float]
    regressions_by_domain: dict[str, dict[str, float]]
    regressions_by_semantic_state: dict[str, dict[str, float]]


class RegressionAnalyzer:
    """Compara benchmarks entre versões de modelo/prompt e detecta regressões."""

    def compare_runs(
        self,
        baseline_version: str,
        candidate_version: str,
        baseline: dict[str, Any],
        candidate: dict[str, Any],
        threshold_delta: float = 0.05,
    ) -> RegressionComparisonResult:
        has_regression = False
        overall_delta: dict[str, float] = {}
        regressions_by_domain: dict[str, dict[str, float]] = {}
        regressions_by_semantic_state: dict[str, dict[str, float]] = {}

        # Check overall groundedness if available
        bg = baseline.get("overall_groundedness", baseline.get("groundedness", 0.0))
        cg = candidate.get("overall_groundedness", candidate.get("groundedness", 0.0))
        delta_g = cg - bg
        overall_delta["groundedness"] = delta_g
        if delta_g < -threshold_delta:
            has_regression = True

        # Domain regressions
        base_domains = baseline.get("domains", baseline.get("domain_metrics", {}))
        cand_domains = candidate.get("domains", candidate.get("domain_metrics", {}))

        for dom, b_metrics in base_domains.items():
            if dom in cand_domains:
                c_metrics = cand_domains[dom]
                dom_regress: dict[str, float] = {}
                for m_name, b_val in b_metrics.items():
                    c_val = c_metrics.get(m_name, 0.0)
                    diff = c_val - b_val
                    if diff < -threshold_delta:
                        dom_regress[m_name] = diff
                        has_regression = True
                if dom_regress:
                    regressions_by_domain[dom] = dom_regress

        # Semantic state regressions
        base_states = baseline.get("semantic_states", baseline.get("semantic_state_metrics", {}))
        cand_states = candidate.get("semantic_states", candidate.get("semantic_state_metrics", {}))

        for st, b_metrics in base_states.items():
            if st in cand_states:
                c_val_obj = cand_states[st]
                b_val_obj = b_metrics
                if isinstance(b_val_obj, dict) and isinstance(c_val_obj, dict):
                    st_regress: dict[str, float] = {}
                    for m_name, b_val in b_val_obj.items():
                        c_val = c_val_obj.get(m_name, 0.0)
                        diff = c_val - b_val
                        if diff < -threshold_delta:
                            st_regress[m_name] = diff
                            has_regression = True
                    if st_regress:
                        regressions_by_semantic_state[st] = st_regress
                else:
                    # scalar
                    diff = float(c_val_obj) - float(b_val_obj)
                    if diff < -threshold_delta:
                        regressions_by_semantic_state[st] = {"score": diff}
                        has_regression = True

        return RegressionComparisonResult(
            baseline_version=baseline_version,
            candidate_version=candidate_version,
            has_regression=has_regression,
            overall_delta=overall_delta,
            regressions_by_domain=regressions_by_domain,
            regressions_by_semantic_state=regressions_by_semantic_state,
        )


class EvalBenchmarkRunner:
    """Runner para disparar o pipeline completo de avaliação."""

    def __init__(self) -> None:
        self.engine = EvaluatorEngine()
        self.analyzer = RegressionAnalyzer()

    def run_benchmark(
        self,
        dataset: EvaluationDataset,
        responses: list[dict[str, Any] | EvaluationResponse],
        model_version: str = "default",
        prompt_version: str = "default",
    ) -> EvaluationReport:
        return self.engine.evaluate_dataset(
            dataset=dataset,
            responses=responses,
            model_version=model_version,
            prompt_version=prompt_version,
        )
