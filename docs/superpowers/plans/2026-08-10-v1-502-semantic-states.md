# V1-502 Semantic States & State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the official 8-state semantic catalog, state machine evaluator, and API/streaming integration in Python `knowledge-api` (`domus_knowledge`) according to issue V1-502.

**Architecture:** Create `semantic_state.py` in `apps/knowledge-api/src/domus_knowledge/` containing `SemanticState` Enum, `SemanticStateCatalog`, and `SemanticStateEvaluator`. Integrate the evaluator into `ContextOrchestrator` and the FastAPI routes in `main.py`.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, Pytest.

## Global Constraints

- Must implement all 8 semantic states verbatim: `fundamentada`, `parcial`, `conflitante`, `sem-evidencia`, `inferida`, `recomendacao`, `obsoleta`, `bloqueada`.
- The frontend must never infer states by regex/heuristics; the state and UI metadata must be returned typed from the backend.
- Pure Python implementation without direct LLM provider keys.

---

### Task 1: Create `SemanticState` Enum and `SemanticStateCatalog`

**Files:**
- Create: `apps/knowledge-api/src/domus_knowledge/semantic_state.py`
- Create: `apps/knowledge-api/tests/test_semantic_state_catalog.py`

**Interfaces:**
- Consumes: Pydantic v2
- Produces: `SemanticState`, `SemanticStateMetadata`, `SemanticStateCatalog`

- [ ] **Step 1: Write failing unit test for `SemanticStateCatalog`**

```python
# apps/knowledge-api/tests/test_semantic_state_catalog.py
import pytest
from domus_knowledge.semantic_state import SemanticState, SemanticStateCatalog, SemanticStateMetadata

def test_catalog_contains_all_eight_states():
    expected_states = {
        "fundamentada", "parcial", "conflitante", "sem-evidencia",
        "inferida", "recomendacao", "obsoleta", "bloqueada"
    }
    catalog_states = {state.value for state in SemanticState}
    assert catalog_states == expected_states

def test_catalog_metadata_for_grounded():
    meta = SemanticStateCatalog.get_metadata(SemanticState.GROUNDED)
    assert meta.state == SemanticState.GROUNDED
    assert meta.label == "Resposta Fundamentada"
    assert meta.tone == "success"
    assert meta.icon == "CheckCircle"
```

- [ ] **Step 2: Run test to verify failure**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_catalog.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'domus_knowledge.semantic_state'`

- [ ] **Step 3: Implement `SemanticState` Enum and `SemanticStateCatalog`**

```python
# apps/knowledge-api/src/domus_knowledge/semantic_state.py
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

class SemanticStateCatalog:
    _METADATA: dict[SemanticState, SemanticStateMetadata] = {
        SemanticState.GROUNDED: SemanticStateMetadata(
            state=SemanticState.GROUNDED,
            label="Resposta Fundamentada",
            description="Resposta totalmente suportada por evidências vigentes e autorizadas.",
            icon="CheckCircle",
            tone="success",
            next_action="Inspecionar citações para detalhes."
        ),
        SemanticState.PARTIAL: SemanticStateMetadata(
            state=SemanticState.PARTIAL,
            label="Resposta Parcial",
            description="Contém evidências parciais; há lacunas não cobertas pelos documentos.",
            icon="AlertCircle",
            tone="warning",
            next_action="Refinar a pergunta ou consultar Knowledge Owner."
        ),
        SemanticState.CONFLICTING: SemanticStateMetadata(
            state=SemanticState.CONFLICTING,
            label="Conflito de Fontes",
            description="Fontes autorizadas contêm informações divergentes ou contraditórias.",
            icon="AlertTriangle",
            tone="danger",
            next_action="Comparar documentos no EvidenceSheet."
        ),
        SemanticState.NO_EVIDENCE: SemanticStateMetadata(
            state=SemanticState.NO_EVIDENCE,
            label="Sem Evidência",
            description="Nenhuma evidência factual relevante encontrada para responder à consulta.",
            icon="HelpCircle",
            tone="muted",
            next_action="Cadastrar solicitação de conhecimento no banco."
        ),
        SemanticState.INFERRED: SemanticStateMetadata(
            state=SemanticState.INFERRED,
            label="Interpretação / Raciocínio",
            description="Raciocínio sintético do modelo extrapolando evidências factuais diretas.",
            icon="Brain",
            tone="info",
            next_action="Validar conclusão com o gestor da área."
        ),
        SemanticState.RECOMMENDATION: SemanticStateMetadata(
            state=SemanticState.RECOMMENDATION,
            label="Recomendação de Ação",
            description="Sugestão orientativa de fluxo ou procedimento operacional.",
            icon="Compass",
            tone="info",
            next_action="Revisar diretriz antes de executar a ação."
        ),
        SemanticState.OUTDATED: SemanticStateMetadata(
            state=SemanticState.OUTDATED,
            label="Fonte Obsoleta",
            description="Baseada em documentos suplantados ou fora do prazo de vigência.",
            icon="Clock",
            tone="warning",
            next_action="Solicitar atualização do documento ao owner."
        ),
        SemanticState.BLOCKED: SemanticStateMetadata(
            state=SemanticState.BLOCKED,
            label="Acesso Restrito",
            description="Conteúdo restrito por alçada de segurança (RLS/ACL) ou falha de transporte.",
            icon="Lock",
            tone="danger",
            next_action="Solicitar elevação de acesso ao administrador."
        ),
    }

    @classmethod
    def get_metadata(cls, state: SemanticState) -> SemanticStateMetadata:
        return cls._METADATA[state]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_catalog.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/semantic_state.py apps/knowledge-api/tests/test_semantic_state_catalog.py
git commit -m "feat(knowledge-api): add 8-state SemanticState Enum and Catalog for V1-502"
```

---

### Task 2: Implement `SemanticStateEvaluator` State Machine

**Files:**
- Modify: `apps/knowledge-api/src/domus_knowledge/semantic_state.py`
- Create: `apps/knowledge-api/tests/test_semantic_state_evaluator.py`

**Interfaces:**
- Consumes: `SemanticState`, `SemanticStateCatalog`, evidence dicts, model text
- Produces: `SemanticEvaluationResult`, `SemanticStateEvaluator.evaluate()`

- [ ] **Step 1: Write failing unit test for `SemanticStateEvaluator`**

```python
# apps/knowledge-api/tests/test_semantic_state_evaluator.py
import pytest
from domus_knowledge.semantic_state import (
    SemanticState,
    SemanticStateEvaluator,
    SemanticEvaluationResult,
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

def test_evaluate_conflicting():
    evaluator = SemanticStateEvaluator()
    evidences = [
        {"source_id": "doc1", "content": "Valor é 10", "has_conflict": True, "conflict_source_id": "doc2"},
        {"source_id": "doc2", "content": "Valor é 20", "has_conflict": True, "conflict_source_id": "doc1"}
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
```

- [ ] **Step 2: Run test to verify failure**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_evaluator.py`
Expected: FAIL with `ImportError: cannot import name 'SemanticStateEvaluator'`

- [ ] **Step 3: Implement `SemanticStateEvaluator`**

Add to `apps/knowledge-api/src/domus_knowledge/semantic_state.py`:

```python
class SemanticEvaluationResult(BaseModel):
    state: SemanticState
    metadata: SemanticStateMetadata
    conflicting_sources: list[dict[str, str]] = Field(default_factory=list)
    outdated_sources: list[dict[str, str]] = Field(default_factory=list)
    reasoning_notes: Optional[str] = None

class SemanticStateEvaluator:
    """Evaluates context evidences and model output to assign one of the 8 semantic states."""

    def evaluate(
        self,
        query: str,
        evidences: list[dict[str, any]],
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
                metadata=SemanticStateCatalog.get_metadata(state)
            )

        # 2. No evidence check
        if not evidences:
            state = SemanticState.NO_EVIDENCE
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state)
            )

        # 3. Conflicting sources check
        conflicting = [
            {"source_id": e.get("source_id", "unknown"), "conflict_with": e.get("conflict_source_id", "")}
            for e in evidences if e.get("has_conflict")
        ]
        if conflicting:
            state = SemanticState.CONFLICTING
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
                conflicting_sources=conflicting,
                reasoning_notes="Fontes fornecem fatos divergentes."
            )

        # 4. Outdated sources check
        outdated = [
            {"source_id": e.get("source_id", "unknown"), "valid_until": str(e.get("valid_until", ""))}
            for e in evidences if e.get("is_outdated")
        ]
        if outdated:
            state = SemanticState.OUTDATED
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state),
                outdated_sources=outdated,
                reasoning_notes="Respostas baseadas em documento fora da vigência."
            )

        # 5. Partial coverage check
        if has_partial_coverage:
            state = SemanticState.PARTIAL
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state)
            )

        # 6. Reasoning / Recommendation check
        if is_recommendation:
            state = SemanticState.RECOMMENDATION
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state)
            )
        if is_reasoning:
            state = SemanticState.INFERRED
            return SemanticEvaluationResult(
                state=state,
                metadata=SemanticStateCatalog.get_metadata(state)
            )

        # 7. Default: Grounded
        state = SemanticState.GROUNDED
        return SemanticEvaluationResult(
            state=state,
            metadata=SemanticStateCatalog.get_metadata(state)
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_evaluator.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/semantic_state.py apps/knowledge-api/tests/test_semantic_state_evaluator.py
git commit -m "feat(knowledge-api): implement SemanticStateEvaluator state machine for V1-502"
```

---

### Task 3: Integrate Semantic Evaluator into `ContextOrchestrator` & `knowledge-api` Routes

**Files:**
- Modify: `apps/knowledge-api/src/domus_knowledge/context_orchestrator.py`
- Modify: `apps/knowledge-api/src/domus_knowledge/main.py`
- Create: `apps/knowledge-api/tests/test_semantic_state_integration.py`

**Interfaces:**
- Consumes: `SemanticStateEvaluator`, `ContextOrchestrator`
- Produces: API response payloads with `semantic_state` and `semantic_metadata`

- [ ] **Step 1: Write failing API integration test**

```python
# apps/knowledge-api/tests/test_semantic_state_integration.py
import pytest
from fastapi.testclient import TestClient
from domus_knowledge.main import app

client = TestClient(app)

def test_intelligence_query_returns_semantic_state():
    payload = {
        "query": "Qual a política de reembolso?",
        "user_roles": ["finance"],
        "evidences": [
            {"source_id": "pol-01", "content": "Reembolso até R$ 100", "required_role": "finance"}
        ]
    }
    response = client.post("/intelligence/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "semantic_state" in data
    assert data["semantic_state"] == "fundamentada"
    assert "semantic_metadata" in data
    assert data["semantic_metadata"]["tone"] == "success"
```

- [ ] **Step 2: Run test to verify failure**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_integration.py`
Expected: FAIL (missing fields in response or route not handling evidences)

- [ ] **Step 3: Update `ContextOrchestrator` and `main.py`**

In `context_orchestrator.py`, integrate `SemanticStateEvaluator`:

```python
from domus_knowledge.semantic_state import SemanticStateEvaluator, SemanticEvaluationResult

# In ContextOrchestrator:
    def __init__(self, policy_version: str = "2.17.0", system_instruction: str = DEFAULT_SYSTEM_INSTRUCTION):
        self.policy_version = policy_version
        self.system_instruction = system_instruction
        self.evaluator = SemanticStateEvaluator()

    def orchestrate_and_evaluate(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        model_output: str = "",
        max_tokens: int = 1024,
    ) -> tuple[OrchestratedContextResult, SemanticEvaluationResult]:
        authorized_evidences = self.filter_authorized_evidences(user_roles, evidences)
        access_denied = len(evidences) > 0 and len(authorized_evidences) == 0
        
        eval_result = self.evaluator.evaluate(
            query=query,
            evidences=authorized_evidences,
            model_output=model_output,
            access_denied=access_denied,
        )
        
        ctx_result = self.orchestrate(query, user_roles, evidences, max_tokens)
        return ctx_result, eval_result
```

In `main.py`:
Update `/intelligence/query` endpoint to return `semantic_state` and `semantic_metadata`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/knowledge-api/tests/test_semantic_state_integration.py`
Expected: PASS

- [ ] **Step 5: Run full test suite for `knowledge-api`**

Run: `pytest apps/knowledge-api/tests/`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/context_orchestrator.py apps/knowledge-api/src/domus_knowledge/main.py apps/knowledge-api/tests/test_semantic_state_integration.py
git commit -m "feat(knowledge-api): integrate semantic state evaluator into intelligence endpoints for V1-502"
```
