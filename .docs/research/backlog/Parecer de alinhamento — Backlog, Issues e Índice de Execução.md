# Parecer de alinhamento — Backlog, Issues e Índice de Execução

**Produto:** Domus Corp v1.0  
**Conclusão:** alinhado após atualização dos artefatos.

## 1. Diagnóstico

Os documentos do backlog já possuíam a issue V1-205 para Design System e questões de acessibilidade, além das issues V1-207, V1-412, V1-510, V1-605, V1-807 e V1-808. Porém, o design system aprovado introduziu decisões mais específicas do que as issues registravam: shadcn/ui, tokens BetaUp, temas light/dark, densidades `default`/`compact`, oito estados semânticos como contrato, componentes compostos de confiança, guardrail contra Indigo/Violeta em Button, Selects sem valores vazios, ordenação previsível, snapshots e color guard.

A lacuna não exigia criar um novo épico ou aumentar a quantidade de issues. A melhor solução foi **enriquecer as issues existentes**, preservar a contagem de 77 issues e tornar o design system uma dependência e um gate transversal.

## 2. Atualizações do backlog mestre

| Issue/área | Atualização |
|---|---|
| V1-205 | Transformada na issue de implementação do design system sobre shadcn/ui, com tokens CSS/TS, seis variantes de Button, 12 componentes compostos, oito estados, dois temas, duas densidades, Storybook, axe-core, Playwright e color guard. |
| V1-206 | Chat passou a exigir `AiResponseCard`, `StreamingIndicator`, estados tipados, temas, densidades, aria-live, snapshots e axe/Playwright. |
| V1-207 | Citações passaram a exigir `CitationPill`, `EvidenceSheet`, `SourceFreshnessBadge`, progressive disclosure, RLS também em tooltip/aria-label e testes de modo compacto. |
| V1-412 | Knowledge Workbench passou a exigir `KnowledgeAssetRow`, `SourceFreshnessBadge`, tabelas compact/default, filtros seguros, Selects com valores não vazios e ordenação declarada. |
| V1-501/V1-502 | O contrato de estados semânticos foi explicitado como enum/schema versionado, catálogo tipado e fonte única para a UI; o frontend não pode classificar respostas por heurística. |
| V1-510 | Intelligence Workbench passou a exigir `InsightCard`, `EvidenceSheet`, densidade, temas e separação visual entre fato, inferência e recomendação. |
| V1-605 | Action Review passou a exigir `ActionReviewDialog`, `PolicyDecisionBanner`, `BudgetMeter`, Button guardrail, confirmação explícita de deleção, estados de execução e testes de risco. |
| V1-807 | A validação passou a cobrir temas, densidades, snapshots, color guard, contraste, foco, zoom, reduced motion e Select.Item não vazio. |
| V1-808 | O release gate passou a bloquear por falha de acessibilidade, contraste, Button guardrail ou versão do design system/tokens. |
| Rastreabilidade | Foi adicionada a referência `RF-048` e `DESIGN_SYSTEM_VALIDACAO` às issues diretamente afetadas. |

## 3. Atualizações do índice de execução

O índice agora posiciona D0–D2 na Onda 2, D3 no Harness/chat, D4 no Knowledge Workbench, D3/D4 no Intelligence Plane, D5 no Action Gateway e D2/D6 no endurecimento e rollout. Também inclui uma trilha explícita de UX/UI e Design System no paralelismo seguro e quatro regras anti-débito:

1. Tokens devem existir antes das telas finais.
2. O contrato de estados deve existir antes das experiências que exibem IA.
3. O guardrail de Button, contraste, snapshots, temas e densidades é gate de CI/release.
4. O backlog mestre é a fonte de verdade; CSV, validação, índice e sínteses devem ser regenerados ou revisados quando uma issue mudar.

## 4. Artefatos regenerados ou revisados

| Artefato | Estado |
|---|---|
| `Backlog_V1_DomusCorp.md` | Atualizado; permanece fonte narrativa de verdade. |
| `Backlog_V1_DomusCorp.csv` | Regenerado a partir do backlog mestre, preservando a hierarquia. |
| `BACKLOG_V1_VALIDACAO.md` | Regenerado; 10 épicos, 77 issues, 77 IDs únicos, zero duplicidade e zero issue incompleta. |
| `INDICE_EXECUCAO_V1_DOMUS.md` | Atualizado com D0–D6, gates e regras anti-débito. |
| `EQUIPE_PRODUCT_IDEATION_BACKLOG_V1.md` | Atualizado com métricas do design system, riscos e artefatos. |

## 5. Verificações finais

A estrutura permanece em **10 épicos e 77 issues**, sem criação de nova issue apenas para duplicar uma decisão já coberta. As referências ao design system aparecem no backlog, no índice, na rastreabilidade, no CSV e na síntese da equipe. A exportação CSV continua hierárquica, com linhas de épico e de issue separadas e `parent_id` preservado.

Os falsos positivos de validações por palavras comuns em português, como “todo”, não representam placeholders. Não foram encontrados tokens de planejamento como `TODO:`, `TBD:`, `FIXME:`, `<substituir>`, `<preencher>` ou `[PLACEHOLDER]` nos artefatos revisados.

## Referências

[1]: ./Backlog_V1_DomusCorp.md "Backlog Mestre de Issues — Domus Corp v1.0"  
[2]: ./INDICE_EXECUCAO_V1_DOMUS.md "Índice de Execução da V1.0 — Domus Corp"  
[3]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System — Domus Corp v1.0"  
[4]: ./DESIGN_SYSTEM_VALIDACAO.md "Validação e handoff — Design System Domus Corp v1.0"  
[5]: ./BACKLOG_V1_VALIDACAO.md "Validação do backlog mestre da v1.0"
