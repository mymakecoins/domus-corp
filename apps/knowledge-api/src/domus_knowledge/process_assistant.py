"""Module for corporate process and policy assistant (V1-503)."""

from typing import Any

from pydantic import BaseModel, Field

from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.model_gateway_client import ModelGatewayClient


class ProcessStep(BaseModel):
    step_number: int = Field(..., description="Número ordinal da etapa.")
    title: str = Field(..., description="Título resumido da etapa.")
    description: str = Field(..., description="Descrição detalhada.")
    roles: list[str] = Field(default_factory=list, description="Papéis responsáveis.")
    inputs: list[str] = Field(default_factory=list, description="Entradas necessárias.")
    exceptions: list[str] = Field(default_factory=list, description="Exceções conhecidas.")
    safe_next_action: dict[str, Any] | None = Field(None, description="Proposta de ação via Action Gateway.")


class ProcessAssistantResponse(BaseModel):
    process_title: str = Field(..., description="Título do processo.")
    owner: str = Field("Não informado", description="Proprietário responsável.")
    effective_source: str = Field("Não informada", description="Fonte vigente.")
    steps: list[ProcessStep] = Field(default_factory=list, description="Etapas ordenadas.")
    exceptions: list[str] = Field(default_factory=list, description="Exceções consolidadas.")
    warnings: list[str] = Field(default_factory=list, description="Alertas de obsolescência/conflito.")
    semantic_state: str = Field(..., description="Estado semântico da resposta.")
    conflicting_sources: list[dict[str, str]] = Field(default_factory=list, description="Fontes conflitantes.")
    outdated_sources: list[dict[str, str]] = Field(default_factory=list, description="Fontes obsoletas.")
    citations: list[dict[str, Any]] = Field(default_factory=list, description="Citações das evidências.")


PROCESS_SYSTEM_INSTRUCTION = (
    "Você é o assistente especializado de processos e políticas corporativas Domus Corp. "
    "Responda estritamente utilizando as evidências em <untrusted_content>. "
    "Detalhamento exigido: etapas ordenadas, papéis responsáveis, entradas, exceções e dona/owner do processo. "
    "Se houver conflito ou obsolescência nas fontes, alerte o usuário e direcione ao owner."
)


class ProcessAssistantEngine:
    """Engine for executing process/policy queries with governance guardrails."""

    def __init__(self, gateway_client: ModelGatewayClient, orchestrator: ContextOrchestrator | None = None):
        self.gateway_client = gateway_client
        self.orchestrator = orchestrator or ContextOrchestrator(system_instruction=PROCESS_SYSTEM_INSTRUCTION)

    async def process_query(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        max_tokens: int = 1024,
    ) -> ProcessAssistantResponse:
        orchestration = self.orchestrator.orchestrate(
            query=query,
            user_roles=user_roles,
            evidences=evidences,
            max_tokens=max_tokens,
        )

        eval_result = self.orchestrator.evaluate_semantic_state(
            query=query,
            user_roles=user_roles,
            evidences=evidences,
        )

        model_result = await self.gateway_client.execute(
            idempotency_key=None,
            messages=orchestration.messages,
            max_tokens=orchestration.maximum_output_tokens,
        )
        output_text = model_result.get("text", "")

        warnings = []
        if eval_result.conflicting_sources:
            sources_str = ", ".join(c.get("source_id", "") for c in eval_result.conflicting_sources)
            warnings.append(f"Atenção: Fontes conflitantes detectadas ({sources_str}). Favor consultar o owner.")
        if eval_result.outdated_sources:
            sources_str = ", ".join(o.get("source_id", "") for o in eval_result.outdated_sources)
            warnings.append(f"Atenção: Fontes obsoletas/quarentenadas ({sources_str}). Favor verificar vigência.")

        authorized_evidences = self.orchestrator.filter_authorized_evidences(user_roles, evidences)
        primary_owner = authorized_evidences[0].get("owner", "Não informado") if authorized_evidences else "Não informado"
        primary_source = authorized_evidences[0].get("source_id", "Não informada") if authorized_evidences else "Não informada"

        steps = [
            ProcessStep(
                step_number=1,
                title="Execução do Processo",
                description=output_text or "Processo instruído conforme fontes.",
                roles=["Solicitante", "Gestor"],
                inputs=["Formulário / Documento"],
                exceptions=[],
                safe_next_action={"action": "propose_action_gateway", "status": "proposed_only"},
            )
        ]

        citations = [
            {
                "chunk_id": chunk.get("chunk_id", ""),
                "source_id": chunk.get("source_id", ""),
                "owner": chunk.get("owner", ""),
            }
            for chunk in authorized_evidences
        ]

        return ProcessAssistantResponse(
            process_title=f"Processo: {query}",
            owner=primary_owner,
            effective_source=primary_source,
            steps=steps,
            exceptions=[],
            warnings=warnings,
            semantic_state=eval_result.state.value,
            conflicting_sources=eval_result.conflicting_sources,
            outdated_sources=eval_result.outdated_sources,
            citations=citations,
        )
