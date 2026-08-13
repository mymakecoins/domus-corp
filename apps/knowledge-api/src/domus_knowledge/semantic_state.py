"""Module for semantic states, metadata catalog, and response evaluation."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SemanticState(str, Enum):
    GROUNDED = "fundamentada"
    PARTIAL = "parcial"
    CONFLICTING = "conflitante"
    NO_EVIDENCE = "sem-evidencia"
    INFERRED = "inferida"
    RECOMMENDATION = "recomendacao"
    OUTDATED = "obsoleta"
    BLOCKED = "bloqueada"


class SemanticStateMetadata(BaseModel):
    state: SemanticState
    label: str
    description: str
    icon: str
    tone: str  # "success" | "warning" | "danger" | "info" | "muted"
    next_action: str


class SemanticStateCatalog:
    _METADATA: dict[SemanticState, SemanticStateMetadata] = {
        SemanticState.GROUNDED: SemanticStateMetadata(
            state=SemanticState.GROUNDED,
            label="Resposta Fundamentada",
            description="Resposta totalmente suportada por evidências vigentes e autorizadas.",
            icon="CheckCircle",
            tone="success",
            next_action="Inspecionar citações para detalhes.",
        ),
        SemanticState.PARTIAL: SemanticStateMetadata(
            state=SemanticState.PARTIAL,
            label="Resposta Parcial",
            description="Contém evidências parciais; há lacunas não cobertas pelos documentos.",
            icon="AlertCircle",
            tone="warning",
            next_action="Refinar a pergunta ou consultar Knowledge Owner.",
        ),
        SemanticState.CONFLICTING: SemanticStateMetadata(
            state=SemanticState.CONFLICTING,
            label="Conflito de Fontes",
            description="Fontes autorizadas contêm informações divergentes ou contraditórias.",
            icon="AlertTriangle",
            tone="danger",
            next_action="Comparar documentos no EvidenceSheet.",
        ),
        SemanticState.NO_EVIDENCE: SemanticStateMetadata(
            state=SemanticState.NO_EVIDENCE,
            label="Sem Evidência",
            description="Nenhuma evidência factual relevante encontrada para responder à consulta.",
            icon="HelpCircle",
            tone="muted",
            next_action="Cadastrar solicitação de conhecimento no banco.",
        ),
        SemanticState.INFERRED: SemanticStateMetadata(
            state=SemanticState.INFERRED,
            label="Interpretação / Raciocínio",
            description="Raciocínio sintético do modelo extrapolando evidências factuais diretas.",
            icon="Brain",
            tone="info",
            next_action="Validar conclusão com o gestor da área.",
        ),
        SemanticState.RECOMMENDATION: SemanticStateMetadata(
            state=SemanticState.RECOMMENDATION,
            label="Recomendação de Ação",
            description="Sugestão orientativa de fluxo ou procedimento operacional.",
            icon="Compass",
            tone="info",
            next_action="Revisar diretriz antes de executar a ação.",
        ),
        SemanticState.OUTDATED: SemanticStateMetadata(
            state=SemanticState.OUTDATED,
            label="Fonte Obsoleta",
            description="Baseada em documentos suplantados ou fora do prazo de vigência.",
            icon="Clock",
            tone="warning",
            next_action="Solicitar atualização do documento ao owner.",
        ),
        SemanticState.BLOCKED: SemanticStateMetadata(
            state=SemanticState.BLOCKED,
            label="Acesso Restrito",
            description="Conteúdo restrito por alçada de segurança (RLS/ACL) ou falha de transporte.",
            icon="Lock",
            tone="danger",
            next_action="Solicitar elevação de acesso ao administrador.",
        ),
    }

    @classmethod
    def get_metadata(cls, state: SemanticState) -> SemanticStateMetadata:
        return cls._METADATA[state]


class SemanticEvaluationResult(BaseModel):
    state: SemanticState
    metadata: SemanticStateMetadata
    conflicting_sources: list[dict[str, str]] = Field(default_factory=list)
    outdated_sources: list[dict[str, str]] = Field(default_factory=list)
    reasoning_notes: str | None = None


class SemanticStateEvaluator:
    """Evaluates context evidences and model output to assign one of the 8 semantic states."""

    def evaluate(
        self,
        query: str,
        evidences: list[dict[str, Any]],
        model_output: str,
        access_denied: bool = False,
        is_reasoning: bool = False,
        is_recommendation: bool = False,
        has_partial_coverage: bool = False,
    ) -> SemanticEvaluationResult:
        # 1. Blocked check
        if access_denied:
            state = SemanticState.BLOCKED
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
            )

        # 2. No evidence check
        if not evidences:
            state = SemanticState.NO_EVIDENCE
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
            )

        # 3. Conflicting sources check
        conflicting = [
            {
                "source_id": str(e.get("source_id", "unknown")),
                "conflict_with": str(e.get("conflict_source_id", "")),
            }
            for e in evidences
            if e.get("has_conflict")
        ]
        if conflicting:
            state = SemanticState.CONFLICTING
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
                conflicting_sources=conflicting,
                reasoning_notes="Fontes fornecem fatos divergentes.",
            )

        # 4. Outdated sources check
        outdated = [
            {
                "source_id": str(e.get("source_id", "unknown")),
                "valid_until": str(e.get("valid_until", "")),
            }
            for e in evidences
            if e.get("is_outdated")
        ]
        if outdated:
            state = SemanticState.OUTDATED
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
                outdated_sources=outdated,
                reasoning_notes="Respostas baseadas em documento fora da vigência.",
            )

        # 5. Partial coverage check
        if has_partial_coverage:
            state = SemanticState.PARTIAL
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
            )

        # 6. Reasoning / Recommendation check
        if is_recommendation:
            state = SemanticState.RECOMMENDATION
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
            )
        if is_reasoning:
            state = SemanticState.INFERRED
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
            )

        # 7. Default: Grounded
        state = SemanticState.GROUNDED
        return SemanticEvaluationResult(
            state=state,
            metadata=SemanticStateCatalog.get_metadata(state),
        )
