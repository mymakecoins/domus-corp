# Design Spec: V1-502 — Estados Semânticos, Conflitos e Ausência de Evidência

**Status:** Aprovado  
**Data:** 2026-08-10  
**Autor:** Antigravity / Equipe Domus Corp  
**Issue:** V1-502  
**Épico:** E5 — Intelligence Plane  
**Marco:** M3 / Onda 5  

---

## 1. Visão Geral e Objetivos

A issue **V1-502** é responsável por instituir a máquina de estados semânticos e a avaliação factual no runtime Python (`apps/knowledge-api/src/domus_knowledge`), garantindo que respostas geradas pela Inteligência Corporativa sejam devidamente classificadas e apresentadas à UI com total rastreabilidade.

### Invariante de Segurança e Governança (ADR-001 / Gate G5)
> **Regra de Ouro:** É expressamente proibido ao frontend deduzir o estado da resposta por heurística ou regex de texto bruto. O estado semântico e seus metadados de UI vm estritamente tipados no payload JSON/SSE retornado pelo backend Python (`knowledge-api`).

---

## 2. Catálogo Tipado dos 8 Estados Semânticos

O catálogo é composto por exatamente 8 estados oficiais, cada um mapeado para um conjunto de metadados visuais e operacionais tipados:

| Enum (`SemanticState`) | Label Visual | Tom (`tone`) | Ícone (`icon`) | Descrição Semântica | Próxima Ação Sugerida (`next_action`) |
|---|---|---|---|---|---|
| `fundamentada` | Resposta Fundamentada | `success` | `CheckCircle` | Resposta totalmente suportada por evidências vigentes e autorizadas. | Inspecionar citações para detalhes. |
| `parcial` | Resposta Parcial | `warning` | `AlertCircle` | Contém evidências parciais; há lacunas não cobertas pelos documentos. | Refinar a pergunta ou consultar Knowledge Owner. |
| `conflitante` | Conflito de Fontes | `danger` | `AlertTriangle` | Fontes autorizadas contêm informações divergentes ou contraditórias. | Comparar documentos no EvidenceSheet. |
| `sem-evidencia` | Sem Evidência | `muted` | `HelpCircle` | Nenhuma evidência factual relevante encontrada para responder à consulta. | Cadastrar solicitação de conhecimento no banco. |
| `inferida` | Interpretação / Raciocínio | `info` | `Brain` | Raciocínio sintético do modelo extrapolando evidências factuais diretas. | Validar conclusão com o gestor da área. |
| `recomendacao` | Recomendação de Ação | `info` | `Compass` | Sugestão orientativa de fluxo ou procedimento operacional. | Revisar diretriz antes de executar a ação. |
| `obsoleta` | Fonte Obsoleta | `warning` | `Clock` | Baseada em documentos suplantados ou fora do prazo de vigência. | Solicitar atualização do documento ao owner. |
| `bloqueada` | Acesso Restrito | `danger` | `Lock` | Conteúdo restrito por alçada de segurança (RLS/ACL) ou falha de transporte. | Solicitar elevação de acesso ao administrador. |

---

## 3. Arquitetura do Módulo `semantic_state.py`

O módulo será criado em `apps/knowledge-api/src/domus_knowledge/semantic_state.py`.

### 3.1. Data Structures & Schemas Pydantic

```python
from enum import Enum
from typing import Optional
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

class SemanticEvaluationResult(BaseModel):
    state: SemanticState
    metadata: SemanticStateMetadata
    conflicting_sources: list[dict[str, str]] = Field(default_factory=list)
    outdated_sources: list[dict[str, str]] = Field(default_factory=list)
    reasoning_notes: Optional[str] = None
```

### 3.2. Lógica do `SemanticStateEvaluator`

O avaliador processa as evidências e o resultado do Model Gateway aplicando a seguinte máquina de estados:

1. **Checagem de Alçada / Bloqueio**: Se `access_denied=True` ou se evidências autorizadas foram zeradas por RLS/ACL enquanto existiam evidências no escopo global -> Estado `bloqueada`.
2. **Checagem de Ausência de Evidência**: Se `authorized_chunk_count == 0` -> Estado `sem-evidencia`.
3. **Checagem de Conflito entre Fontes**: Se evidências possuem flags de conflito explícito (ex: versões divergentes de um mesmo regulamento com valores incompatíveis) ou se foram marcadas como contraditórias -> Estado `conflitante`.
4. **Checagem de Obsolescência**: Se a evidência principal utilizada possui `is_outdated=True` ou data de vigência ultrapassada -> Estado `obsoleta`.
5. **Checagem de Cobertura Parcial**: Se a consulta possui múltiplos aspectos e apenas parte deles tem suporte nas evidências -> Estado `parcial`.
6. **Checagem de Inferência / Recomendação**: Se o output contém marcação de raciocínio sintético ou recomendação sem citação direta -> Estado `inferida` ou `recomendacao`.
7. **Caso Padrão**: Se todas as afirmações possuem citação de evidência vigente e sem conflito -> Estado `fundamentada`.

---

## 4. Integração com os Endpoints de Inteligência (`knowledge-api`)

Nos endpoints `/intelligence/query` e no gerador de respostas em streaming:
- O payload de resposta incluirá o campo `semantic_state` (Enum) e o objeto `semantic_metadata`.
- Eventos SSE SSE `completed` transmitirão obrigatoriamente o campo `semantic_state` em conformidade com o schema `model-stream-event.schema.json`.

---

## 5. Estratégia de Testes e Validação

1. **Testes Unitários em Pytest** (`apps/knowledge-api/tests/test_semantic_state.py`):
   - Teste de catálogo: validação de todos os 8 estados e seus metadados.
   - Testes de máquina de estados: fixtures sintéticas para cada um dos 8 estados.
   - Teste de conflito: validação da extração e exposição de `conflicting_sources`.
2. **Testes de Integração de API**:
   - `/intelligence/query` retornando estado semântico e metadados no contrato esperado.
