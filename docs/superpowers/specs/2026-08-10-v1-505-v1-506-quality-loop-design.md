# Design Spec: V1-505 e V1-506 — Feedback de Respostas, Quality Loop e Detecção de Lacunas de Conhecimento (Knowledge Gaps)

**Data**: 2026-08-10  
**Status**: Aprovado  
**Issues**: V1-505 (Feedback, revisão e Quality Loop - P0) e V1-506 (Detecção de lacunas de conhecimento / Knowledge Gaps - P1)  
**Rastreabilidade**: RF-031, RF-034, RF-035; RN-013; REQ-003; PRD 5.2.3; ADR-001  
**Módulos**: `apps/knowledge-api` (Backend Python), `migrations` (PostgreSQL), `contracts` (JSON Schemas)

---

## 1. Visão Geral e Objetivos

Este documento especifica a arquitetura e o design técnico das capacidades de **Quality Loop** (V1-505) e **Detecção de Lacunas de Conhecimento** (V1-506) para o ecossistema Domus Corp.

1. **Feedback de Respostas e Quality Loop (V1-505)**:
   - Permite que colaboradores enviem feedback explícito sobre respostas, citações, alegações (claims), processos e políticas, classificando o tipo de problema (`error`, `missing_source`, `outdated`, `low_utility`, `policy_issue`).
   - O `QualityLoopEngine` consolida feedbacks recorrentes para gerar sugestões de revisão com proprietário (owner) atribuído, score de impacto e histórico comparativo de alterações sem sobrescrever originais (não destrutivo).
2. **Detecção de Lacunas de Conhecimento / Knowledge Gaps (V1-506)**:
   - O `KnowledgeGapDetector` analisa o histórico de buscas e requisições de recuperação (a partir da auditoria de retrieval `v1_411_retrieval_audit`), identifica perguntas recorrentes sem evidência elegível, com baixa confiança ou com fontes conflitantes.
   - Aplica salvaguardas de privacidade (`PromptSanitizer`) para remover PII/dados sensíveis das amostras de perguntas, agrega e calcula score de impacto, sugerindo fontes candidatas e atribuição a Knowledge Owners.

---

## 2. Persistência em Banco de Dados (`000022_v1_505_v1_506_quality_loop.up.sql`)

### 2.1. Tabela `feedback_records`
Armazena feedbacks individuais de colaboradores sobre respostas ou artefatos de conhecimento.
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_id` (VARCHAR(64), NOT NULL)
- `user_id` (VARCHAR(64), NOT NULL)
- `target_id` (VARCHAR(128), NOT NULL) — ID da resposta, documento, chunk, claim ou processo
- `target_type` (VARCHAR(32), NOT NULL) — `response`, `evidence`, `claim`, `process`, `policy`
- `feedback_type` (VARCHAR(32), NOT NULL) — `error`, `missing_source`, `outdated`, `low_utility`, `policy_issue`
- `rating` (INT, CHECK 1..5 ou -1/+1)
- `comment` (TEXT)
- `evidence_version` (VARCHAR(64))
- `status` (VARCHAR(32), DEFAULT 'pending') — `pending`, `under_review`, `resolved`, `dismissed`
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.2. Tabela `quality_loop_suggestions`
Registra tarefas consolidadas de melhoria da base de conhecimento derivadas de feedbacks recorrentes.
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `target_type` (VARCHAR(32), NOT NULL)
- `target_id` (VARCHAR(128), NOT NULL)
- `suggested_action` (TEXT, NOT NULL) — Ex: "Atualizar norma de reembolsos devido a obsolescência"
- `recommended_owner` (VARCHAR(128), NOT NULL)
- `frequency_count` (INT, DEFAULT 1)
- `impact_score` (FLOAT, DEFAULT 0.0)
- `status` (VARCHAR(32), DEFAULT 'open') — `open`, `in_review`, `resolved`, `dismissed`
- `before_state` (JSONB) — Estado anterior da fonte/claim/prompt para comparação antes/depois
- `after_state` (JSONB) — Estado revisado após correção
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.3. Tabela `knowledge_gaps`
Registra lacunas de conhecimento identificadas via análise de requisições de retrieval.
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_ids` (JSONB, NOT NULL) — Lista de workspaces afetados
- `topic` (VARCHAR(255), NOT NULL) — Tema/cluster da lacuna
- `sample_queries` (JSONB, NOT NULL) — Lista de perguntas sanitizadas representativas
- `frequency` (INT, DEFAULT 1)
- `impact_score` (FLOAT, DEFAULT 0.0)
- `candidate_sources` (JSONB, DEFAULT '[]'::jsonb) — Sugestões de documentos/fontes candidatas
- `status` (VARCHAR(32), DEFAULT 'open') — `open`, `in_review`, `resolved`, `ignored`
- `assigned_owner` (VARCHAR(128))
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 3. Contratos e Schemas JSON (`contracts/json-schema/v1/`)

1. `feedback-record.schema.json`: Schema para validação cross-runtime de requisições e eventos de feedback.
2. `quality-loop-suggestion.schema.json`: Schema para sugestões de melhoria consolidada do Quality Loop.
3. `knowledge-gap.schema.json`: Schema para lacunas de conhecimento identificadas e atribuídas.

---

## 4. Arquitetura dos Módulos em Python (`apps/knowledge-api/src/domus_knowledge/`)

### 4.1. `domus_knowledge.quality_loop` (`QualityLoopEngine`)
- `FeedbackRecord`: Pydantic model representando um feedback de usuário.
- `QualityLoopSuggestion`: Pydantic model representando uma sugestão de revisão.
- `FeedbackRepository`: Repositório de persistência SQL (com fallbacks parametrizáveis em memória para suítes de teste).
- `QualityLoopEngine`:
  - `submit_feedback(...)`: Ingesta um novo feedback e verifica se a frequência atinge o limiar para consolidar uma `QualityLoopSuggestion`.
  - `list_feedbacks(...)`: Lista registros de feedback filtrados por workspace, tipo e status.
  - `list_suggestions(...)`: Retorna sugestões consolidadas de revisão para os Knowledge Owners.
  - `resolve_suggestion(...)`: Aplica ou marca uma correção como resolvida, salvando a comparação `before_state` vs `after_state`.

### 4.2. `domus_knowledge.knowledge_gaps` (`KnowledgeGapDetector`)
- `KnowledgeGap`: Pydantic model representando uma lacuna de conhecimento.
- `GapRepository`: Repositório de persistência para as lacunas detectadas.
- `KnowledgeGapDetector`:
  - `detect_gaps(retrieval_logs: list[dict], min_frequency: int = 2)`: Analisa logs de requisições de recuperação (ex: `semantic_state == "no_evidence"` ou `confidence < threshold`), utiliza o `PromptSanitizer` para remover PII dos textos de busca, agrupa por temas/clusters e calcula o `impact_score`.
  - `list_gaps(...)`: Lista lacunas abertas ou sob revisão com filtro por tenant e workspace.
  - `update_gap(...)`: Atualiza status, atribuição de proprietário ou registro de fontes candidatas.

---

## 5. Endpoints REST em `apps/knowledge-api/src/domus_knowledge/main.py`

- `POST /v1/quality-loop/feedback`: Envia novo feedback do colaborador.
- `GET /v1/quality-loop/feedback`: Lista feedbacks no escopo do usuário/workspace.
- `GET /v1/quality-loop/suggestions`: Lista sugestões consolidadas de revisão para Knowledge Owners.
- `POST /v1/quality-loop/suggestions/{suggestion_id}/resolve`: Conclui revisão com histórico comparativo antes/depois.
- `POST /v1/knowledge-gaps/detect`: Executa o job de detecção de lacunas de conhecimento sobre logs de retrieval.
- `GET /v1/knowledge-gaps`: Lista lacunas de conhecimento registradas.
- `PATCH /v1/knowledge-gaps/{gap_id}`: Atualiza estado, owner atribuído ou fontes candidatas de uma lacuna.

---

## 6. Segurança, Privacidade e Conformidade (ADR-001)

1. **Privacidade e Redaction (V1-506)**: As perguntas enviadas pelos usuários que geram lacunas de conhecimento passam obrigatoriamente por sanitização (`PromptSanitizer`) antes de serem armazenadas em `sample_queries` na tabela `knowledge_gaps`, evitando exposição indevida de dados pessoais ou segredos corporativos para os gestores da base de conhecimento.
2. **Isolamento Tenant/Workspace (RLS Lógico)**: Consultas e atualizações de feedbacks e lacunas exigem validação rigorosa do `tenant_id` e filtragem nos `workspace_ids` autorizados do usuário solicitante.
3. **Preservação Não Destrutiva de Histórico (V1-505)**: Atualizações e correções oriundas do Quality Loop salvam o estado de origem (`before_state`) e o estado atualizado (`after_state`), garantindo auditabilidade e rastreabilidade total das mudanças normativas na base de conhecimento.

---

## 7. Estratégia de Testes

- `tests/test_quality_loop.py`: Testes unitários do `QualityLoopEngine` (criação de feedbacks, agregação por limiar de frequência, resolução e histórico antes/depois).
- `tests/test_knowledge_gaps.py`: Testes unitários do `KnowledgeGapDetector` (análise de logs de ausência de evidência, sanitização de PII em sample queries, agrupamento de lacunas e cálculo de score de impacto).
- `tests/test_quality_and_gap_endpoints.py`: Testes de integração dos endpoints FastAPI `/v1/quality-loop/*` e `/v1/knowledge-gaps/*` com cliente de teste FastAPI.
- `tests/migrations/test_v1_505_v1_506_migrations.py`: Testes de validação da migração PostgreSQL `000022_v1_505_v1_506_quality_loop`.
