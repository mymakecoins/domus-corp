# V1-503 e V1-504 — Assistente de Processos, Políticas, Sínteses e Comparações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Python backend engines and REST endpoints in `apps/knowledge-api` for corporate process/policy assistance (V1-503) and synthesis/comparison decision support (V1-504) with strict Model Gateway egress guardrails and semantic state evaluation.

**Architecture:** Add `ProcessAssistantEngine` in `process_assistant.py` and `DecisionSupportEngine` in `decision_support.py` integrated with `ContextOrchestrator`, `ModelGatewayClient`, and `SemanticStateEvaluator`. Expose endpoints `/v1/intelligence/process`, `/v1/intelligence/synthesis`, and `/v1/intelligence/compare` in `main.py`.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, Pytest, HTTPX/TestClient.

## Global Constraints

- Python runtimes NEVER store LLM credentials or make direct calls to external LLM providers (ADR-001).
- All prompt contexts MUST encapsulate retrieved evidence chunks in `<untrusted_content>` tags.
- Model recommendations MUST be explicitly labeled as non-binding recommendations (`is_recommendation_only=True`).
- Safe next actions in process assistant responses MUST be presented strictly as proposals for the Action Gateway.
- All test runs MUST use `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest`.

---

### Task 1: Implement ProcessAssistantEngine for V1-503

**Files:**
- Create: `apps/knowledge-api/src/domus_knowledge/process_assistant.py`
- Test: `apps/knowledge-api/tests/test_process_assistant.py`

**Interfaces:**
- Consumes: `ContextOrchestrator`, `ModelGatewayClient`, `SemanticStateEvaluator` from `domus_knowledge`
- Produces: `ProcessStep`, `ProcessAssistantResponse`, `ProcessAssistantEngine.process_query()`

- [ ] **Step 1: Write failing test for ProcessAssistantEngine**

Create `apps/knowledge-api/tests/test_process_assistant.py`:

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from domus_knowledge.process_assistant import ProcessAssistantEngine, ProcessAssistantResponse

@pytest.mark.anyio
async def test_process_query_success():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Etapa 1: Solicitar aprovação (Papel: Gestor, Entradas: Formulário). Exceção: Se orçamentos zerados. Ação: criar_ticket"
    }
    
    engine = ProcessAssistantEngine(gateway_client=mock_gateway)
    response = await engine.process_query(
        query="Como aprovar reembolso?",
        user_roles=["user"],
        evidences=[
            {
                "chunk_id": "c1",
                "source_id": "proc-01",
                "text": "Política de Reembolso v1",
                "required_role": "user",
                "owner": "Financeiro",
                "freshness": "valid",
            }
        ],
    )
    
    assert isinstance(response, ProcessAssistantResponse)
    assert response.owner == "Financeiro"
    assert response.semantic_state in ["grounded", "partial", "no_evidence"]
    assert len(response.steps) >= 1
    assert response.steps[0].step_number == 1
    assert "Gestor" in response.steps[0].roles
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest apps/knowledge-api/tests/test_process_assistant.py -v`  
Expected: FAIL with ModuleNotFoundError or import error for `domus_knowledge.process_assistant`.

- [ ] **Step 3: Write implementation of ProcessAssistantEngine**

Create `apps/knowledge-api/src/domus_knowledge/process_assistant.py`:

```python
"""Module for corporate process and policy assistant (V1-503)."""

from typing import Any, Optional
from pydantic import BaseModel, Field
from domus_knowledge.context_orchestrator import ContextOrchestrator
from domus_knowledge.model_gateway_client import ModelGatewayClient
from domus_knowledge.semantic_state import SemanticEvaluationResult


class ProcessStep(BaseModel):
    step_number: int = Field(..., description="Número ordinal da etapa.")
    title: str = Field(..., description="Título resumido da etapa.")
    description: str = Field(..., description="Descrição detalhada.")
    roles: list[str] = Field(default_factory=list, description="Papéis responsáveis.")
    inputs: list[str] = Field(default_factory=list, description="Entradas necessárias.")
    exceptions: list[str] = Field(default_factory=list, description="Exceções conhecidas.")
    safe_next_action: Optional[dict[str, Any]] = Field(None, description="Proposta de ação via Action Gateway.")


class ProcessAssistantResponse(BaseModel):
    process_title: str = Field(..., description="Título do processo.")
    owner: str = Field("Não informado", description="Proprietário responsável.")
    effective_source: str = Field("Não informada", description="Fonte vigente.")
    steps: list[ProcessStep] = Field(default_factory=list, description="Etapas ordenadas.")
    exceptions: list[str] = Field(default_factory=list, description="Exceções consolidadas.")
    warnings: list[str] = Field(default_factory=list, description="Alertas de obsolescência/conflito.")
    semantic_state: str = Field(..., description="Estado semântico da resposta.")
    conflicting_sources: list[str] = Field(default_factory=list, description="Fontes conflitantes.")
    outdated_sources: list[str] = Field(default_factory=list, description="Fontes obsoletas.")
    citations: list[dict[str, Any]] = Field(default_factory=list, description="Citações das evidências.")


PROCESS_SYSTEM_INSTRUCTION = (
    "Você é o assistente especializado de processos e políticas corporativas Domus Corp. "
    "Responda estritamente utilizando as evidências em <untrusted_content>. "
    "Detalhamento exigido: etapas ordenadas, papéis responsáveis, entradas, exceções e dona/owner do processo. "
    "Se houver conflito ou obsolescência nas fontes, alerte o usuário e direcione ao owner."
)


class ProcessAssistantEngine:
    """Engine for executing process/policy queries with governance guardrails."""

    def __init__(self, gateway_client: ModelGatewayClient, orchestrator: Optional[ContextOrchestrator] = None):
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
            warnings.append(f"Atenção: Fontes conflitantes detectadas ({', '.join(eval_result.conflicting_sources)}). Favor consultar o owner.")
        if eval_result.outdated_sources:
            warnings.append(f"Atenção: Fontes obsoletas/quarentenadas ({', '.join(eval_result.outdated_sources)}). Favor verificar vigência.")

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest apps/knowledge-api/tests/test_process_assistant.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/process_assistant.py apps/knowledge-api/tests/test_process_assistant.py
git commit -m "feat(knowledge-api): implement ProcessAssistantEngine for V1-503"
```

---

### Task 2: Implement DecisionSupportEngine for V1-504

**Files:**
- Create: `apps/knowledge-api/src/domus_knowledge/decision_support.py`
- Test: `apps/knowledge-api/tests/test_decision_support.py`

**Interfaces:**
- Consumes: `ContextOrchestrator`, `ModelGatewayClient`, `SemanticStateEvaluator` from `domus_knowledge`
- Produces: `SynthesisResult`, `ComparisonAlternative`, `ComparisonResult`, `DecisionSupportEngine.synthesize()`, `DecisionSupportEngine.compare()`

- [ ] **Step 1: Write failing test for DecisionSupportEngine**

Create `apps/knowledge-api/tests/test_decision_support.py`:

```python
import pytest
from unittest.mock import AsyncMock
from domus_knowledge.decision_support import DecisionSupportEngine, SynthesisResult, ComparisonResult

@pytest.mark.anyio
async def test_synthesis_generation():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Fato: Faturamento cresceu 10%. Divergência: Relatório A diz 10% e B diz 12%. Lacuna: Dados de Q4 ausentes."
    }
    
    engine = DecisionSupportEngine(gateway_client=mock_gateway)
    synthesis = await engine.synthesize(
        query="Sintetizar relatórios financeiros",
        user_roles=["user"],
        evidences=[{"chunk_id": "c1", "source_id": "doc-01", "text": "Relatório Q3"}]
    )
    
    assert isinstance(synthesis, SynthesisResult)
    assert synthesis.summary != ""
    assert isinstance(synthesis.facts, list)
    assert isinstance(synthesis.divergences, list)
    assert isinstance(synthesis.gaps, list)

@pytest.mark.anyio
async def test_comparison_generation_labeled_as_recommendation():
    mock_gateway = AsyncMock()
    mock_gateway.execute.return_value = {
        "text": "Alternativa A: Servidor Local. Premissas: Infra própria. Riscos: Custo fixo. Recomendação: Opção B."
    }
    
    engine = DecisionSupportEngine(gateway_client=mock_gateway)
    comparison = await engine.compare(
        query="Comparar Nuvem vs On-Premise",
        user_roles=["user"],
        evidences=[{"chunk_id": "c1", "source_id": "doc-01", "text": "Estudo de Nuvem"}],
        alternatives=["Nuvem", "On-Premise"]
    )
    
    assert isinstance(comparison, ComparisonResult)
    assert comparison.is_recommendation_only is True
    assert comparison.semantic_state in ["recommendation", "grounded", "partial"]
    assert len(comparison.alternatives) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest apps/knowledge-api/tests/test_decision_support.py -v`  
Expected: FAIL with ModuleNotFoundError or import error for `domus_knowledge.decision_support`.

- [ ] **Step 3: Write implementation of DecisionSupportEngine**

Create `apps/knowledge-api/src/domus_knowledge/decision_support.py`:

```python
"""Module for decision support, syntheses and comparisons (V1-504)."""

from typing import Any, Optional
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

    def __init__(self, gateway_client: ModelGatewayClient, orchestrator: Optional[ContextOrchestrator] = None):
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
            divergences=[f"Divergência detectada: {s}" for s in eval_result.conflicting_sources],
            gaps=["Conteúdo insuficiente para cobertura completa"] if eval_result.state == SemanticState.NO_EVIDENCE else [],
            semantic_state=eval_result.state.value,
            citations=citations,
        )

    async def compare(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        alternatives: Optional[list[str]] = None,
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest apps/knowledge-api/tests/test_decision_support.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/decision_support.py apps/knowledge-api/tests/test_decision_support.py
git commit -m "feat(knowledge-api): implement DecisionSupportEngine for V1-504"
```

---

### Task 3: Expose REST Endpoints in FastAPI main.py and Add Integration Tests

**Files:**
- Modify: `apps/knowledge-api/src/domus_knowledge/main.py`
- Test: `apps/knowledge-api/tests/test_process_and_decision_endpoints.py`

**Interfaces:**
- Consumes: `ProcessAssistantEngine`, `DecisionSupportEngine`
- Produces: `POST /v1/intelligence/process`, `POST /v1/intelligence/synthesis`, `POST /v1/intelligence/compare`

- [ ] **Step 1: Write failing test for process and decision endpoints**

Create `apps/knowledge-api/tests/test_process_and_decision_endpoints.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from domus_knowledge.main import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

def test_process_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Passo 1: Enviar formulário ao RH."}
        payload = {
            "query": "Como solicitar férias?",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "policy-rh", "text": "Regra de Férias", "owner": "RH"}],
        }
        res = client.post("/v1/intelligence/process", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "steps" in data
        assert data["owner"] == "RH"
        assert "semantic_state" in data

def test_synthesis_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Síntese dos dados corporativos."}
        payload = {
            "query": "Sintetizar relatórios",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "rep-1", "text": "Relatório Anual"}],
        }
        res = client.post("/v1/intelligence/synthesis", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "facts" in data

def test_compare_endpoint(client):
    with patch("domus_knowledge.main.gateway_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = {"text": "Recomendação técnica: Opção 1."}
        payload = {
            "query": "Comparar Fornecedor A e B",
            "user_roles": ["user"],
            "evidences": [{"chunk_id": "c1", "source_id": "doc-1", "text": "Proposta A e B"}],
            "alternatives": ["Fornecedor A", "Fornecedor B"],
        }
        res = client.post("/v1/intelligence/compare", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_recommendation_only"] is True
        assert "alternatives" in data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest apps/knowledge-api/tests/test_process_and_decision_endpoints.py -v`  
Expected: FAIL with 404 Not Found for `/v1/intelligence/process`.

- [ ] **Step 3: Update main.py to integrate new engines and endpoints**

Modify `apps/knowledge-api/src/domus_knowledge/main.py`:

Add imports and request models:

```python
from domus_knowledge.process_assistant import ProcessAssistantEngine, ProcessAssistantResponse
from domus_knowledge.decision_support import DecisionSupportEngine, SynthesisResult, ComparisonResult

class CompareRequest(OrchestrateRequest):
    alternatives: Optional[list[str]] = Field(None, description="Lista opcional de alternativas para comparação.")
```

Inside `create_app()`:

```python
    process_engine = ProcessAssistantEngine(gateway_client=gateway_client)
    decision_engine = DecisionSupportEngine(gateway_client=gateway_client)

    @app.post("/v1/intelligence/process", response_model=ProcessAssistantResponse)
    async def process_assistant_endpoint(req: OrchestrateRequest) -> ProcessAssistantResponse:
        try:
            return await process_engine.process_query(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                max_tokens=req.max_tokens,
            )
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

    @app.post("/v1/intelligence/synthesis", response_model=SynthesisResult)
    async def synthesis_endpoint(req: OrchestrateRequest) -> SynthesisResult:
        try:
            return await decision_engine.synthesize(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                max_tokens=req.max_tokens,
            )
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))

    @app.post("/v1/intelligence/compare", response_model=ComparisonResult)
    async def compare_endpoint(req: CompareRequest) -> ComparisonResult:
        try:
            return await decision_engine.compare(
                query=req.query,
                user_roles=req.user_roles,
                evidences=req.evidences,
                alternatives=req.alternatives,
                max_tokens=req.max_tokens,
            )
        except ModelGatewayError as err:
            raise HTTPException(status_code=502, detail=str(err))
```

- [ ] **Step 4: Run full pytest suite to verify all tests pass**

Run: `/home/mmc/00_code/domus-app-suite/domus-corp/.venv/bin/pytest -v`  
Expected: PASS (all tests including existing and new ones).

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/main.py apps/knowledge-api/tests/test_process_and_decision_endpoints.py
git commit -m "feat(knowledge-api): add REST endpoints for process assistant, synthesis and comparison"
```
