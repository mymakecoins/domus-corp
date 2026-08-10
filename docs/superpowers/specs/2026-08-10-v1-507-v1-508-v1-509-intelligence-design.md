# Design Spec: V1-507, V1-508 e V1-509 — Detecção de Mudanças, Briefings Contextuais On-Demand e Engine de Insights Operacionais Explicáveis

**Data**: 2026-08-10  
**Status**: Aprovado  
**Issues**: 
- V1-507 (Detecção de mudanças, obsolescência e impacto - P1)
- V1-508 (Briefings contextuais por papel, workspace e periodicidade - P1)
- V1-509 (Engine de insights operacionais explicáveis - P1)  
**Rastreabilidade**: RF-020, RF-029, RF-030, RF-032, RF-033, RF-039; RN-016, RN-017; UX-005; PRD 5.2.3; ADR-001  
**Módulos**: `apps/knowledge-api` (Backend Python), `migrations` (PostgreSQL), `contracts` (JSON Schemas)

---

## 1. Visão Geral e Arquitetura

Este documento define a arquitetura técnica, modelo de persistência, schemas de validação e API REST para a tríade de inteligência operacional da Onda 5:

1. **Detecção de Mudanças e Impacto (V1-507)**:
   - Identifica alterações estruturais, normativas, informativas ou irrelevantes entre versões de conteúdo/processos.
   - Mapeia domínios, processos, briefings e proprietários (owners) impactados, calculando o `impact_score` e deduplicando alterações repetidas.

2. **Briefings Contextuais On-Demand (V1-508)**:
   - Compila sínteses executivas/operacionais adaptadas ao perfil do usuário (`role`), workspace e janela temporal.
   - Consolida informações de mudanças (V1-507), lacunas (V1-506) e alertas de qualidade (V1-505).
   - Identifica e sinaliza expressamente fontes desatualizadas ou sem evidência direta.
   - Respeita o estado de pausa do usuário (`is_paused=True`), registrando auditoria.
   - Suporta compilação sob demanda em E5 (preparando suporte a agendamento automático em E6).

3. **Engine de Insights Operacionais Explicáveis (V1-509)**:
   - Avalia métricas de conhecimento e operacionais contra limiares versionados (`thresholds`).
   - Gera insights estruturados com título, descrição, severidade (`low`, `medium`, `high`, `critical`), nível de confiança (0.0 a 1.0), janela temporal, regra/modelo, evidências e recomendação não executada automaticamente.
   - Retém insights de alto impacto ou baixa confiança em `draft` / `under_review` até revisão por proprietário humano.
   - Registra feedbacks (falsos positivos/verdadeiros positivos) para ajuste dos limiares sem perda de histórico.

---

## 2. Persistência em Banco de Dados (`migrations/000023_v1_507_v1_508_v1_509_intelligence.up.sql`)

### 2.1. Tabela `change_records`
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_id` (VARCHAR(64), NOT NULL)
- `source_id` (VARCHAR(128), NOT NULL)
- `source_type` (VARCHAR(32), NOT NULL) — `document`, `process`, `policy`, `claim`
- `change_type` (VARCHAR(32), NOT NULL) — `structural`, `normative`, `informative`, `irrelevant`
- `impact_score` (FLOAT, DEFAULT 0.0)
- `impacted_domains` (JSONB, NOT NULL, DEFAULT '[]'::jsonb)
- `impacted_owners` (JSONB, NOT NULL, DEFAULT '[]'::jsonb)
- `before_digest` (TEXT)
- `after_digest` (TEXT)
- `status` (VARCHAR(32), DEFAULT 'pending') — `pending`, `reviewed`, `grouped`
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.2. Tabela `briefing_records`
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_id` (VARCHAR(64), NOT NULL)
- `user_id` (VARCHAR(64), NOT NULL)
- `role` (VARCHAR(64), NOT NULL)
- `summary` (TEXT, NOT NULL)
- `changes_included` (JSONB, DEFAULT '[]'::jsonb)
- `gaps_included` (JSONB, DEFAULT '[]'::jsonb)
- `quality_alerts` (JSONB, DEFAULT '[]'::jsonb)
- `staleness_warnings` (JSONB, DEFAULT '[]'::jsonb)
- `is_paused` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.3. Tabela `briefing_preferences`
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_id` (VARCHAR(64), NOT NULL)
- `user_id` (VARCHAR(64), NOT NULL)
- `is_paused` (BOOLEAN, DEFAULT FALSE)
- `periodicity` (VARCHAR(32), DEFAULT 'weekly')
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.4. Tabela `operational_insights`
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `workspace_id` (VARCHAR(64), NOT NULL)
- `title` (VARCHAR(255), NOT NULL)
- `description` (TEXT, NOT NULL)
- `rule_id` (VARCHAR(128), NOT NULL)
- `severity` (VARCHAR(32), NOT NULL) — `low`, `medium`, `high`, `critical`
- `confidence` (FLOAT, DEFAULT 1.0)
- `time_window` (VARCHAR(64), NOT NULL)
- `evidences` (JSONB, NOT NULL, DEFAULT '[]'::jsonb)
- `recommended_owner` (VARCHAR(128))
- `recommended_action` (TEXT)
- `status` (VARCHAR(32), DEFAULT 'draft') — `draft`, `under_review`, `published`, `dismissed`
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.5. Tabela `insight_thresholds`
- `id` (UUID, Primary Key)
- `tenant_id` (VARCHAR(64), NOT NULL)
- `rule_id` (VARCHAR(128), NOT NULL)
- `version` (INT, DEFAULT 1)
- `threshold_value` (FLOAT, NOT NULL)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `updated_by` (VARCHAR(128))
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

### 2.6. Tabela `insight_feedbacks`
- `id` (UUID, Primary Key)
- `insight_id` (UUID, NOT NULL REFERENCES operational_insights(id) ON DELETE CASCADE)
- `user_id` (VARCHAR(64), NOT NULL)
- `feedback_type` (VARCHAR(32), NOT NULL) — `false_positive`, `true_positive`, `inaccurate_severity`
- `comment` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

---

## 3. Contratos e Schemas JSON (`contracts/json-schema/v1/`)

1. `change-record.schema.json`: Eventos de mudança e cálculo de impacto.
2. `briefing-record.schema.json`: Briefings contextuais compilados com avisos de transparência.
3. `operational-insight.schema.json`: Insights operacionais explicáveis, limiares e feedbacks.

---

## 4. Módulos em Python (`apps/knowledge-api/src/domus_knowledge/`)

### 4.1. `domus_knowledge.change_detection` (`ChangeImpactDetector`)
- `ChangeRecord`: Modelo Pydantic.
- `ChangeRepository`: Persistência SQL e suporte em memória para testes.
- `ChangeImpactDetector`:
  - `detect_change(tenant_id, workspace_id, source_id, source_type, before_content, after_content)`: Analisa diff, classifica o tipo (`structural`, `normative`, `informative`, `irrelevant`), calcula `impact_score` e identifica domínios/owners afetados.
  - `group_similar_changes(...)`: Agrupa mudanças semelhantes para evitar alertas redundantes.
  - `list_changes(...)`: Lista mudanças filtradas por workspace e tipo.

### 4.2. `domus_knowledge.briefings` (`BriefingEngine`)
- `BriefingRecord`: Modelo Pydantic.
- `BriefingPreferences`: Modelo Pydantic.
- `BriefingRepository`: Persistência SQL e suporte em memória.
- `BriefingEngine`:
  - `generate_briefing(tenant_id, workspace_id, user_id, role, time_window)`: Verifica preferências de pausa. Se ativo, compila mudanças (V1-507), lacunas (V1-506) e alertas (V1-505), sinalizando explicitamente fontes sem evidência ou desatualizadas.
  - `update_preferences(tenant_id, workspace_id, user_id, is_paused, periodicity)`: Atualiza status de pausa e periodicidade.
  - `list_briefings(...)`: Lista históricos de briefings gerados.

### 4.3. `domus_knowledge.operational_insights` (`OperationalInsightsEngine`)
- `OperationalInsight`: Modelo Pydantic.
- `InsightThreshold`: Modelo Pydantic.
- `InsightFeedback`: Modelo Pydantic.
- `InsightRepository`: Persistência SQL e suporte em memória.
- `OperationalInsightsEngine`:
  - `evaluate_signals(tenant_id, workspace_id, signals)`: Compara sinais acumulados com `insight_thresholds`. Se excederem o limiar, cria o insight. Se `severity >= high` ou `confidence < 0.75`, marca como `draft`/`under_review`.
  - `review_insight(insight_id, action, owner)`: Transiciona insight de `draft`/`under_review` para `published` ou `dismissed`.
  - `submit_feedback(insight_id, user_id, feedback_type, comment)`: Registra feedback e ajusta limiar versionado no caso de falso positivo recorrente.
