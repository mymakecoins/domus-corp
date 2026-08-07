# Parecer de alinhamento — Design System, PRD e ADR

**Produto:** Domus Corp v1.0  
**Conclusão:** alinhado após atualização dos documentos.

## 1. Diagnóstico

Antes da revisão, o PRD e o ADR já cobriam acessibilidade, estados de confiança, evidência, Action Review, Electron, workbenches e a pasta `packages-ts/ui-system`. Entretanto, tratavam o design system apenas como preocupação geral de UX. Não estavam formalizados como decisões de produto e arquitetura o uso de shadcn/ui, o contrato de tokens BetaUp, a proibição de Indigo/Violeta em botões, a densidade `default`/`compact`, os componentes compostos de confiança e os gates específicos de interface.

## 2. Atualizações realizadas no PRD

| Área | Atualização |
|---|---|
| Visão do produto | Inclusão da seção de design system e confiança de interface. |
| Requisitos funcionais | Inclusão do RF-048 para tokens, temas, densidade, oito estados semânticos e guardrail de Button. |
| Requisitos não funcionais | Inclusão de consistência visual, guardrail de botões e UX de confiança; expansão da acessibilidade para zoom e reduced motion. |
| Regras de negócio | Inclusão das RN-030 a RN-034 para tokens, Indigo/Violeta, estados derivados de contrato, revelação progressiva, Selects e ordenação de listas. |
| Dependências | Inclusão de design system/UI e qualidade de interface com shadcn/ui, Tailwind, Radix, Lucide, Storybook, axe-core e Playwright. |
| Cronograma | D0–D2 em F1, D3–D4 em F3, D5 em F5 e D6 em F7. |
| Rastreabilidade | Design system vinculado às issues V1-205, V1-207, V1-412, V1-510, V1-605, V1-807 e V1-808. |
| Referências | Inclusão do shadcn/ui, design system e WCAG 2.2. |

## 3. Atualizações realizadas no ADR

| Área | Atualização |
|---|---|
| Frontend | Inclusão explícita do design system como decisão de frontend. |
| Arquitetura | Nova seção sobre tokens em três camadas, Button sem Indigo/Violeta, estados de IA contratados, EvidenceSheet, ActionReviewDialog, densidade, temas e gates de acessibilidade. |
| Ownership | `packages-ts/ui-system` fica responsável pela biblioteca base; componentes compostos Domus ficam em namespace separado. |
| Testes | Inclusão de gate para tokens, snapshots light/dark, densidade, Button guardrail, axe-core e Playwright. |
| Fases | Inclusão das ondas D0–D6 nos marcos de Harness, Intelligence, Action e Rollout. |
| Referências | Inclusão de shadcn/ui, especificação do design system e WCAG 2.2. |

## 4. O que não foi alterado

A revisão não alterou a categoria do produto, a divisão TypeScript/Fastify + Python/FastAPI, a fronteira do Model Gateway, o Knowledge Fabric, a política fail-closed, o modelo de dados, a autoridade do backend, a sequência de dependências ou a regra de que o frontend não pode ampliar ACL/RLS. O design system foi incorporado como contrato de interface sobre essas fronteiras, não como uma nova camada de autorização.

## 5. Verificações finais

| Verificação | Resultado |
|---|---:|
| PRD contém seção de design system | Sim |
| PRD contém RF-048 | Sim |
| PRD contém NFRs de consistência, Button e UX de confiança | Sim |
| PRD contém RN-030 a RN-034 | Sim |
| ADR contém decisão explícita de design system | Sim |
| ADR contém gate de testes de design system | Sim |
| ADR contém hooks D0–D6 no plano de implementação | Sim |
| Referências novas presentes | Sim |
| Contradição com stack ou governança | Não identificada |

## 6. Parecer

A atualização era necessária, mas não exigia um novo ADR independente. O design system é uma decisão arquitetural subordinada ao ADR-001: formaliza a camada de frontend, torna a UX de confiança testável e introduz guardrails visuais e de acessibilidade. Um novo ADR só será necessário se o projeto mudar a fundação de UI, permitir uma segunda biblioteca base, relaxar a regra de cores em botões, transformar componentes de interface em autoridade de segurança ou alterar os contratos de estados da IA.

## Referências

[1]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"  
[2]: ./PRD_DomusCorp.md "PRD — Domus Corp v1.0"  
[3]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 — Arquitetura do Domus Corp"  
[4]: ./DESIGN_SYSTEM_VALIDACAO.md "Validação e handoff — Design System Domus Corp v1.0"
