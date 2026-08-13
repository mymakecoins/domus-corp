# Runbook de Suporte, Rollout de Piloto Controlado e Decisão Executiva (Gate G8) — V1-904

**Domus Corp v1.0 — Épico E9 (Operação, Release e Piloto)**  
*Documento de Referência Operacional e de Governança*

---

## 1. Visão Geral do Piloto Controlado (V1-904)

O objetivo da issue **V1-904** é conduzir o piloto controlado do **Domus Corp v1.0** com workspaces selecionados, medindo valor, qualidade, segurança, adocão, groundedness e sustentabilidade financeira antes da expansão corporativa global (Gate G8).

---

## 2. Estrutura de Anéis de Rollout (Groups & Rings)

| Anel | Grupo / Nome | Workspaces Autorizados | Fontes Homologadas | Owners Responsáveis | Canal de Suporte | Critérios de Entrada | Critérios de Saída |
|---|---|---|---|---|---|---|---|
| **Ring 0** | Canary Interno | `ws-internal-qa`, `ws-sre-ops` | `mcp_notion`, `mcp_jira` | Alice (WS), Bob (Biz), SRE (Tech), CS Lead | `#domus-pilot-internal` | Gate G7 Aprovado, Audit OK | 0 P0s por 7 dias, Groundedness > 0.85 |
| **Ring 1** | Early Adopters | `ws-finance-core`, `ws-hr-policies` | `mcp_notion`, `mcp_jira`, `sharepoint_docs` | Owner Finance, Owner HR, SRE, CS Lead | `#domus-pilot-early` | Ring 0 aprovado, Treinamento concluído | CSAT > 4.0, Taxa de bloqueio < 5% |
| **Ring 2** | Expansão Departamento | Workspaces de Filiais | Todas as fontes conectadas | Owners Departamentais, SRE, CS | `#domus-pilot-expanded` | Gate G8 assinado pelo Comitê | Escala 100% de usuários |

---

## 3. Telemetria de Adoção e Instrumentação de Métricas

O motor de telemetria (`PilotRolloutManager` / `TaskTelemetryPayload`) monitora em tempo real:

1. **Adoção e Engajamento:**
   - Workspaces ativos e Usuários Únicos Diários (DAU).
   - Volume total de tarefas executadas com sucesso.
   - Taxa de conclusão de treinamento.

2. **Sustentabilidade Financeira (Custo por Tarefa):**
   - Consumo de tokens (Prompt + Completion).
   - Custo médio por tarefa (meta: $\le \$0.15$/tarefa).

3. **Fidelidade e Groundedness (Evals):**
   - Pontuação média de Groundedness (meta: $\ge 0.85$).
   - Fidelidade de citações e ausência de alucinações.

4. **Desempenho e Segurança:**
   - Latência p95 (meta: $\le 800\text{ ms}$).
   - Taxa de Bloqueio (Block Rate) por políticas de segurança.
   - Ocorrências de incidentes (P0, P1) e Gaps de Conhecimento reportados.

---

## 4. Matriz de Kill-Switches e Contenção Operacional

Em caso de incidentes ou regressões, o comitê ou operador SRE aciona os kill-switches via API `/api/v1/pilot/kill-switch/trigger` ou CLI auditável:

| Ação de Kill-Switch | Descrição | Comportamento Sistêmico | Preservação de Evidências |
|---|---|---|---|
| `DISCONNECT_CONNECTOR` | Desconecta uma fonte de dados/MCP específica de um grupo. | Bloqueia novas consultas ao conector sem remover indexação. | Preservado em log de auditoria com ID `EV-KS-*`. |
| `REVERT_POLICY` | Reverte o barramento de políticas para o estado restritivo fallback. | Aplica guardrails estritos e desativa execuções de risco. | Preservado em log de auditoria com ID `EV-KS-*`. |
| `REDUCE_RING` | Desativa um anel de rollout superior (ex: desativa Ring 1). | Usuários do anel são isolados temporariamente. | Preservado em log de auditoria com ID `EV-KS-*`. |
| `EMERGENCY_ROLLBACK` | Desativa todos os anéis de piloto imediatamente. | Sistema entra em estado seguro estático (*fail-closed*). | Traces, logs e métricas mantidos intactos para post-mortem. |

---

## 5. Critérios da Decisão Executiva de Expansão (Gate G8)

A transição do piloto para a expansão geral (Gate G8) é avaliada pelo componente `GateG8Report`:

- **Aprovado para Expansão (`APPROVED_FOR_EXPANSION`):**
  - Groundedness médio $\ge 0.85$.
  - Custo médio por tarefa $\le \$0.15$.
  - Zero incidentes P0 não contidos.
  - Taxa de bloqueio dentro da tolerância operacional.
  - Evidências de auditoria e segurança 100% preservadas.

- **Pausado para Remediação (`PAUSED_REMEDIATION_REQUIRED`):**
  - Métricas de qualidade ou custo fora da tolerância sem incidentes críticos.

- **Rollback Acionado (`ROLLBACK_TRIGGERED`):**
  - Incidente P0 de segurança ou integridade identificado durante o piloto.

---

## 6. Backlog Priorizado para a V1.1

Com a conclusão do piloto, o backlog v1.1 é formalizado com as seguintes iniciativas prioritárias:

1. **V1.1-001:** Expansão de conectores auto-regenerativos para SharePoint e Google Drive.
2. **V1.1-002:** Re-ranking dinâmico de groundedness baseado em sinal implícito de feedback do usuário.
3. **V1.1-003:** Otimização dinâmica de custo por tarefa através de escolha adaptativa de modelo (*model routing*).
