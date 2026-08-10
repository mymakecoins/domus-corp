# Design Spec: V1-503 e V1-504 — Assistente de Processos, Políticas, Sínteses e Comparações de Decisão

**Data**: 2026-08-10  
**Status**: Aprovado  
**Issues**: V1-503 (Assistente de processos e políticas) e V1-504 (Sínteses, comparações e cenários de decisão)  
**Rastreabilidade**: RF-027, RF-028, RF-033; PRD 4.3; ADR-001  
**Módulo**: `apps/knowledge-api` (Backend Python)

---

## 1. Visão Geral e Objetivos

Este documento especifica o design técnico e arquitetural das issues **V1-503** e **V1-504** para o runtime Python (`knowledge-api`). O objetivo é prover inteligência corporativa governada para:
1. **Assistente de Processos e Políticas (V1-503)**: Responder como executar processos corporativos, detalhando etapas ordenadas, papéis, entradas, exceções, fontes vigentes, avisos de obsolescência/conflito e propostas de próximas ações (delimitadas pelo Action Gateway).
2. **Sínteses, Comparações e Suporte à Decisão (V1-504)**: Sintetizar múltiplos documentos autorizados segregando fatos, divergências e lacunas, e gerar comparações de alternativas com matriz de impacto/risco e recomendações rotuladas sem status de decisão aprovada.

---

## 2. Arquitetura de Módulos

### 2.1. `domus_knowledge.process_assistant` (`ProcessAssistantEngine`)
- **Modelos de Dados**:
  - `ProcessStep`: `step_number` (int), `title` (str), `description` (str), `roles` (list[str]), `inputs` (list[str]), `exceptions` (list[str]), `safe_next_action` (Optional[dict]).
  - `ProcessAssistantResponse`: `process_title` (str), `owner` (str), `effective_source` (str), `steps` (list[ProcessStep]), `exceptions` (list[str]), `warnings` (list[str]), `semantic_state` (str), `conflicting_sources` (list[str]), `outdated_sources` (list[str]), `citations` (list[dict]).
- **Regras de Negócio**:
  - Filtra evidências autorizadas usando `user_roles`.
  - Processa prompt sanitizado com `<untrusted_content>` via `ModelGatewayClient`.
  - Avalia o estado semântico via `SemanticStateEvaluator`. Se houver fontes conflitantes ou obsoletas, popula `warnings` e orienta encaminhamento ao owner.
  - Ações externas em `safe_next_action` são rotuladas explicitamente como *propostas pendentes de aprovação pelo Action Gateway*.

### 2.2. `domus_knowledge.decision_support` (`DecisionSupportEngine`)
- **Modelos de Dados**:
  - `SynthesisResult`: `summary` (str), `facts` (list[str]), `divergences` (list[str]), `gaps` (list[str]), `semantic_state` (str), `citations` (list[dict]).
  - `ComparisonAlternative`: `name` (str), `description` (str), `premises` (list[str]), `impacts` (list[str]), `risks` (list[str]), `uncertainties` (list[str]), `evidence_ids` (list[str]).
  - `ComparisonResult`: `criteria` (list[str]), `alternatives` (list[ComparisonAlternative]), `recommendation` (str), `is_recommendation_only` (bool = True), `semantic_state` (str = "recommendation"), `citations` (list[dict]).
- **Regras de Negócio**:
  - **Síntese**: Extrai e categoriza o conteúdo gerado em fatos comprovados, divergências entre fontes e lacunas de informação não cobertas pelas evidências.
  - **Comparação**: Estrutura as alternativas avaliando premissas, impactos, riscos e incertezas. A sugestão final é obrigatoriamente rotulada como recomendação técnica (`is_recommendation_only=True`), nunca como decisão aprovada.

### 2.3. Endpoints REST em `domus_knowledge.main`
- `POST /v1/intelligence/process`: Executa o assistente de processos (V1-503).
- `POST /v1/intelligence/synthesis`: Executa a síntese de documentos e fontes autorizadas (V1-504).
- `POST /v1/intelligence/compare`: Executa a comparação de cenários e alternativas (V1-504).

---

## 3. Segurança e Conformidade (ADR-001)

1. **Model Gateway Strict Egress**: Toda inferência é feita via `ModelGatewayClient` direcionado à control-plane TypeScript em Fastify. Nenhuma chave de API externa ou chamada direta a provedores é realizada pelo runtime Python.
2. **Sanitização de Prompts**: Todos os trechos de evidência recuperados são isolados em tags `<untrusted_content>` com metadados de proveniência (`chunk_id`, `source_id`, `version_id`, `locator`).
3. **Controle de Acesso (ACL/RLS)**: Trechos de evidência que exigem `required_role` não pertencente aos `user_roles` do solicitante são removidos antes da montagem do contexto.

---

## 4. Estratégia de Testes

- `tests/test_process_assistant.py`: Validação unitária do parsing de processos, avisos de obsolescência e guardrails de ação.
- `tests/test_decision_support.py`: Validação unitária de sínteses (fatos vs lacunas vs divergências) e comparações (rotulagem de recomendação).
- `tests/test_process_and_decision_endpoints.py`: Testes de integração dos endpoints FastAPI `/v1/intelligence/process`, `/v1/intelligence/synthesis` e `/v1/intelligence/compare` com mocks do gateway HTTP.
