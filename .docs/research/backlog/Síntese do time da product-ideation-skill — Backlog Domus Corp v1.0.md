# Síntese do time da product-ideation-skill — Backlog Domus Corp v1.0

## Objetivo

As sete perspectivas da `product-ideation-skill` foram mobilizadas para transformar o PRD, o ADR, a matriz de requisitos, a pesquisa inicial e o backlog do Harness em um backlog único para a v1.0 da Plataforma de Inteligência Corporativa com IA.[1] [2] [3] [4] [5]

A equipe trabalhou com a decisão de arquitetura poliglota controlada: **TypeScript + Fastify** no Harness, Control Plane, Model Gateway, Policy, Budget, Auditoria, MCP e Action Gateway; **Python + FastAPI/workers** em Knowledge e Intelligence; contratos OpenAPI/JSON Schema/AsyncAPI; e no máximo duas linguagens de produção.

## Perspectivas mobilizadas

| Perspectiva | Contribuição consolidada |
|---|---|
| **Project Manager** | Priorização P0/P1, marcos M0–M5, riscos executivos, gates, escopo e caminho crítico. |
| **Requirements Analyst** | Requisitos testáveis, estados semânticos, claims, evidências, gaps e Quality Loop. |
| **Architect** | Fronteiras dos quatro planos, egress obrigatório pelo Model Gateway, contratos cross-runtime e Knowledge Graph Lite. |
| **DBA** | PostgreSQL, RLS, migrações, Qdrant, MinIO, backup/restore, retenção, particionamento e performance. |
| **UX/UI** | Design System sobre shadcn/ui, tokens BetaUp, temas light/dark, densidades `default`/`compact`, guardrail de Button sem Indigo/Violeta, oito estados semânticos, acessibilidade, citações, Knowledge Workbench, Intelligence Workbench e Action Review. |
| **QA** | Testes de contrato, fail-closed, groundedness, idempotência, red-team, carga, resiliência e release gate. |
| **Software Engineer** | Granularidade implementável, monorepo, CI/CD, Model Gateway, Policy, Budget, ingestão, retrieval e Action Gateway. |

## Resultado consolidado

| Métrica | Resultado |
|---|---:|
| Épicos | 10 |
| Issues | 77 |
| P0 | 61 |
| P1 | 16 |
| IDs duplicados | 0 |
| Issues sem objetivo | 0 |
| Issues sem critérios de aceite | 0 |
| Linguagens de produção | 2 |
| Estados semânticos da IA | 8 |
| Temas de interface | 2 — light/dark |
| Densidades de interface | 2 — default/compact |
| Variantes de Button sem Indigo/Violeta | 6 |

A consolidação removeu duplicidades entre propostas dos agentes. Por exemplo, contratos cross-runtime foram consolidados em V1-003 e V1-801; policy e fail-closed em V1-103 e V1-802; ACL/RLS e retrieval em V1-409–V1-411; e Action Gateway, confirmação, idempotência e QA em V1-604–V1-606 e V1-805.

## Gates de risco elevado

As issues que exigem revisão humana especializada antes de merge são V1-002, V1-003, V1-005, V1-103, V1-205, V1-207, V1-301, V1-304, V1-305, V1-409, V1-411, V1-502, V1-603, V1-604, V1-605, V1-606, V1-702, V1-802, V1-803, V1-806, V1-807 e V1-808. Nenhuma dessas capacidades deve ser liberada com base apenas em código gerado por modelo, teste feliz ou demonstração manual.

## Protocolo de uso de Claude, Gemini, Codex e Kimi

O backlog inclui uma política explícita de desenvolvimento assistido por IA. Modelos podem auxiliar análise, scaffolding, testes, documentação, prototipagem, avaliação e red-team. A aprovação final de requisitos, arquitetura, segurança, schema, migrações, código crítico, prompts de produção, dados e releases permanece humana. Segredos, dados corporativos não autorizados e acesso autônomo a produção estão proibidos.

## Artefatos entregues

| Arquivo | Uso |
|---|---|
| `Backlog_V1_DomusCorp.md` | Backlog mestre narrativo com todas as issues, critérios Dado–Quando–Então, DoD, dependências, rastreabilidade e protocolo de IA. |
| `Backlog_V1_DomusCorp.csv` | Exportação hierárquica para importação: linhas de épico preenchem `epico`; linhas de issue preenchem `user_story`; `parent_id` mantém o vínculo. |
| `BACKLOG_V1_VALIDACAO.md` | Validação automática de contagem, IDs, objetivos e critérios de aceite. |
| `DESIGN_SYSTEM_DOMUS_CORP.md` | Especificação de tokens, componentes, estados, acessibilidade e handoff de UI. |
| `domus-design-tokens.css` / `domus-design-tokens.ts` | Tokens CSS/HSL e tokens tipados usados pelas issues de frontend. |
| `EQUIPE_PRODUCT_IDEATION_BACKLOG_V1.md` | Este resumo da mobilização e consolidação das sete perspectivas. |

## Referências

[1]: ./PRD_DomusCorp.md "PRD — Domus Corp v1.0"  
[2]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 — Arquitetura do Domus Corp"  
[3]: ./upload/BacklogdeIssues—HarnessCorporativodeIA.md "Backlog original — Harness Corporativo de IA"  
[4]: ./upload/harness_requirements_matrix.md "Matriz de requisitos — Harness Corporativo de IA"  
[5]: ./upload/pesquisa-inicial.md "Pesquisa inicial — tese e posicionamento do Domus Corp"  
[6]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"  
[7]: ./DESIGN_SYSTEM_VALIDACAO.md "Validação e handoff — Design System Domus Corp v1.0"
