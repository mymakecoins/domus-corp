"""Module for semantic states, metadata catalog, and response evaluation."""

from enum import Enum
from typing import Any, Optional
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
