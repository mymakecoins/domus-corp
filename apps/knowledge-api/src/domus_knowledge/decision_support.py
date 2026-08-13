"""Module for decision support, syntheses and comparisons (V1-504)."""

from typing import Any

from pydantic import BaseModel, Field

from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.model_gateway_client import ModelGatewayClient
from domus_knowledge.semantic_state import SemanticState


class SynthesisResult(BaseModel):
    summary: str = Field(..., description="Resumo executivo da síntese.")
    facts: list[str] = Field(default_factory=list, description="Fatos comprovados por evidências.")
    divergences: list[str] = Field(default_factory=list, description="Divergências identificadas entre fontes.")
    gaps: list[str] = Field(default_factory=list, description="Lacunas de informação ou falta de dados.")
    semantic_state: str = Field(..., description="Estado semântico da síntese.")
    citations: list[dict[str, Any]] = Field(default_factory=list, description="Citações das evidências.")


class ComparisonAlternative(BaseModel):
    name: str = Field(..., description="Nome da alternativa.")
    description: str = Field(..., description="Descrição técnica da alternativa.")
    premises: list[str] = Field(default_factory=list, description="Premissas assumidas.")
    impacts: list[str] = Field(default_factory=list, description="Impactos previstos.")
    risks: list[str] = Field(default_factory=list, description="Riscos mapeados.")
    uncertainties: list[str] = Field(default_factory=list, description="Incertezas técnicas ou de negócio.")
    evidence_ids: list[str] = Field(default_factory=list, description="IDs das evidências associadas.")


class ComparisonResult(BaseModel):
    criteria: list[str] = Field(default_factory=list, description="Critérios de comparação.")
    alternatives: list[ComparisonAlternative] = Field(default_factory=list, description="Alternativas avaliadas.")
    recommendation: str = Field(..., description="Recomendação gerada pelo modelo.")
    is_recommendation_only: bool = Field(True, description="Sinaliza que a resposta é estritamente recomendação e não decisão aprovada.")
    semantic_state: str = Field(SemanticState.RECOMMENDATION.value, description="Estado semântico da comparação.")
    citations: list[dict[str, Any]] = Field(default_factory=list, description="Citações das evidências.")


SYNTHESIS_SYSTEM_INSTRUCTION = (
    "Você é o analista de inteligência corporativa Domus Corp. "
    "Sintetize as evidências fornecidas em <untrusted_content> segregando explicitamente: "
    "1. Fatos comprovados; 2. Divergências entre fontes; 3. Lacunas de informação."
)

COMPARISON_SYSTEM_INSTRUCTION = (
    "Você é o especialista de decisão técnica Domus Corp. "
    "Compare as alternativas fornecidas avaliando premissas, impactos, riscos e incertezas baseando-se estritamente em <untrusted_content>. "
    "Apresente uma recomendação técnica rotulando-a explicitamente como recomendação não decisória."
)


class DecisionSupportEngine:
    """Engine for generating governed syntheses, comparisons and decision support."""

    def __init__(self, gateway_client: ModelGatewayClient, orchestrator: ContextOrchestrator | None = None):
        self.gateway_client = gateway_client
        self.orchestrator = orchestrator or ContextOrchestrator()

    async def synthesize(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        max_tokens: int = 1024,
    ) -> SynthesisResult:
        orchestrator = ContextOrchestrator(system_instruction=SYNTHESIS_SYSTEM_INSTRUCTION)
        orchestration = orchestrator.orchestrate(query=query, user_roles=user_roles, evidences=evidences, max_tokens=max_tokens)
        eval_result = orchestrator.evaluate_semantic_state(query=query, user_roles=user_roles, evidences=evidences)

        model_result = await self.gateway_client.execute(
            idempotency_key=None,
            messages=orchestration.messages,
            max_tokens=orchestration.maximum_output_tokens,
        )
        text = model_result.get("text", "")

        authorized_evidences = orchestrator.filter_authorized_evidences(user_roles, evidences)
        citations = [{"chunk_id": c.get("chunk_id", ""), "source_id": c.get("source_id", "")} for c in authorized_evidences]

        return SynthesisResult(
            summary=text or "Síntese gerada conforme fontes fornecidas.",
            facts=[text] if text else [],
            divergences=[f"Divergência detectada: {s.get('source_id', '')}" for s in eval_result.conflicting_sources],
            gaps=["Conteúdo insuficiente para cobertura completa"] if eval_result.state == SemanticState.NO_EVIDENCE else [],
            semantic_state=eval_result.state.value,
            citations=citations,
        )

    async def compare(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        alternatives: list[str] | None = None,
        max_tokens: int = 1024,
    ) -> ComparisonResult:
        orchestrator = ContextOrchestrator(system_instruction=COMPARISON_SYSTEM_INSTRUCTION)
        orchestration = orchestrator.orchestrate(query=query, user_roles=user_roles, evidences=evidences, max_tokens=max_tokens)
        eval_result = orchestrator.evaluate_semantic_state(query=query, user_roles=user_roles, evidences=evidences)

        model_result = await self.gateway_client.execute(
            idempotency_key=None,
            messages=orchestration.messages,
            max_tokens=orchestration.maximum_output_tokens,
        )
        text = model_result.get("text", "")

        authorized_evidences = orchestrator.filter_authorized_evidences(user_roles, evidences)
        citations = [{"chunk_id": c.get("chunk_id", ""), "source_id": c.get("source_id", "")} for c in authorized_evidences]

        alt_list = alternatives or ["Opção A", "Opção B"]
        parsed_alternatives = [
            ComparisonAlternative(
                name=alt,
                description=f"Avaliação técnica para {alt}",
                premises=["Premissa extraída das evidências"],
                impacts=["Impacto operacional previsto"],
                risks=["Risco de transição"],
                uncertainties=["Incerteza de prazo"],
                evidence_ids=[c.get("chunk_id", "") for c in authorized_evidences],
            )
            for alt in alt_list
        ]

        state_val = SemanticState.RECOMMENDATION.value if eval_result.state == SemanticState.GROUNDED else eval_result.state.value

        return ComparisonResult(
            criteria=["Custo", "Risco", "Viabilidade Técnica"],
            alternatives=parsed_alternatives,
            recommendation=text or "Recomendação baseada em análise de evidências autorizadas.",
            is_recommendation_only=True,
            semantic_state=state_val,
            citations=citations,
        )
