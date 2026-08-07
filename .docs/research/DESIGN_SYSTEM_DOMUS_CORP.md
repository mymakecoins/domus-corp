# Design System — Domus Corp v1.0

**Produto:** Domus Corp — Plataforma de Inteligência Corporativa com IA  
**Fundação de UI:** [shadcn/ui][1] + Tailwind CSS + Radix UI + Lucide Icons  
**Paleta de origem:** BetaUp Soluções — [tokens e paleta anexados][2]  
**Status:** Especificação aprovada para implementação  
**Autor:** Equipe multidisciplinar da `product-ideation-skill`  
**Data:** 07/08/2026

## 1. Propósito

O design system do Domus Corp traduz a proposta de uma **Plataforma de Inteligência Corporativa com IA** em uma linguagem visual consistente, acessível, densa e confiável. Ele deve funcionar como a camada de interface dos quatro planos do produto: **Harness, Knowledge, Intelligence e Action**.

A base escolhida é o shadcn/ui. O projeto não deve tratar a biblioteca como um pacote visual fechado, mas como um conjunto de componentes acessíveis e customizáveis a partir do código do próprio produto. Essa abordagem é coerente com a orientação oficial do projeto de usar seus componentes para construir uma biblioteca própria.[1]

O design system não tem como objetivo decorar respostas de IA. Sua responsabilidade é tornar visíveis **proveniência, vigência, confiança, conflito, bloqueio, risco, alçada e próxima ação segura** sem transformar cada tela em um painel burocrático.

> **Princípio central:** a interface deve tornar a operação mais rápida dentro dos limites corretos, nunca esconder os limites para parecer mais fluida.

## 2. Decisões obrigatórias

| Decisão | Regra |
|---|---|
| **Base de componentes** | Usar componentes instalados e mantidos no repositório a partir de shadcn/ui. Customizações vivem no código do Domus, não em overrides frágeis de uma biblioteca externa. |
| **Cor primária de interação** | Beta Blue `#0468F7`, com hover Blue 700 `#1D4ED8`. |
| **Botões** | Não usar Core Indigo `#271BAE` nem Beta Violet `#310AE3` em background, hover, active ou borda ativa de qualquer `Button`. |
| **Indigo e Violeta** | Reservados a fundos profundos, overlays, gradientes de marca e elementos decorativos ou informativos não acionáveis. |
| **Estados da IA** | Sempre comunicar estado por texto + ícone + cor + estrutura; nunca depender somente da cor. |
| **Dados sensíveis** | A UI exibe somente dados autorizados pelos contratos, policy e RLS. Ocultação de conteúdo não pode ser simulada apenas no frontend. |
| **Acessibilidade** | Alvo WCAG 2.2 AA, com contraste, foco, teclado, leitor de tela, redução de movimento e zoom testados. |
| **Densidade** | Suportar `default` para uso geral e `compact` para workbenches, tabelas e dashboards de governança. |
| **IA assistida** | Código gerado por modelos passa por revisão humana, testes de acessibilidade, contrato e segurança antes de merge. |

## 3. Arquitetura de tokens

Os tokens têm três camadas. A camada **primitiva** contém valores da paleta; a camada **semântica** expressa intenção; e a camada **de componente** decide como um componente usa a intenção. Componentes não devem referenciar hexadecimais diretamente quando já existe token semântico equivalente.

```text
BetaUp palette primitives
        ↓
Domus semantic tokens
        ↓
shadcn/ui component tokens
        ↓
Product surfaces: Chat, Workbench, Knowledge, Action Review
```

### 3.1. Tokens primitivos de marca

| Token | Valor | Uso recomendado | Uso proibido |
|---|---|---|---|
| `brand.primary` / Beta Blue | `#0468F7` | CTAs, links ativos, foco, seleção, progresso e evidência interativa | Nenhum, desde que o contraste seja validado |
| `brand.accent` / Beta Cyan | `#02A4FC` | Streaming, detalhes de inovação, highlights sobre fundos escuros | Texto pequeno sobre fundo claro |
| `brand.depth` / Core Indigo | `#271BAE` | Profundidade, fundos escuros, overlays, hero e gradientes | Qualquer background, hover, active ou borda ativa de botão |
| `brand.secondary` / Beta Violet | `#310AE3` | Destaque de marca, gradientes, superfícies promocionais e diferenciação não acionável | Qualquer background, hover, active ou borda ativa de botão |

A paleta original recomenda o azul como cor principal e o violeta como suporte, reservando gradientes para momentos de marca em vez de áreas densas de texto.[2] O Domus torna essa regra mais estrita para preservar a legibilidade operacional.

### 3.2. Neutros e superfícies

| Token | Valor | Papel no Domus |
|---|---|---|
| `text.primary` / Ink | `#111827` | Texto principal, títulos, números de KPI e conteúdo de resposta |
| `text.secondary` / Graphite | `#272A31` | Texto secundário de alta ênfase e cabeçalhos de seção |
| `text.muted` / Slate | `#5B6472` | Metadados, labels, timestamps e suporte |
| `text.inverse` / White | `#FFFFFF` | Texto sobre Beta Blue e fundos escuros |
| `surface.default` / White | `#FFFFFF` | Cards, dialogs, sheets, menus e superfícies flutuantes |
| `surface.subtle` / Cloud | `#F6F8FC` | Fundo de página e áreas de trabalho claras |
| `surface.dark` / Deep Night | `#191C24` | Painéis escuros, navegação e blocos densos |
| `surface.deep` / Midnight | `#0B1020` | Hero, dark mode profundo e fundos premium |
| `border.default` | `#E2E8F0` | Divisores, bordas de cards e tabelas |
| `border.strong` | `#CBD5E1` | Inputs, foco estrutural e divisores de maior hierarquia |

### 3.3. Estados funcionais

| Token | Base | Variante de contraste | Uso |
|---|---|---|---|
| `state.success` | `#19C37D` | `#166534` | Operação concluída, fonte aprovada, resposta fundamentada |
| `state.success.soft` | `#DCFCE7` | — | Fundo de badge, alert e callout positivo |
| `state.warning` | `#F5A524` | `#B45309` | Revisão necessária, vigência próxima, conflito ou incerteza |
| `state.warning.soft` | `#FEF3C7` | — | Fundo de aviso e estado pendente |
| `state.error` | `#EF4444` | `#B91C1C` | Falha, bloqueio, rejeição ou risco crítico |
| `state.error.soft` | `#FEE2E2` | — | Fundo de erro e bloqueio |
| `state.info` | `#3B82F6` | `#1D4ED8` | Informação, ajuda e contexto neutro-positivo |
| `state.info.soft` | `#DBEAFE` | — | Fundo de informação e evidência contextual |

As variantes fortes são **tokens derivados de acessibilidade**, não novas cores de marca. Elas são necessárias para texto e ícones sobre fundos suaves quando o valor base não oferecer contraste suficiente.

### 3.4. Tokens específicos de IA

| Token | Mapeamento | Significado |
|---|---|---|
| `ai.processing` | Sky Tech `#38BDF8` | Modelo processando ou transmitindo resposta |
| `ai.grounded` | Success `#19C37D` | Evidência válida, vigente e autorizada |
| `ai.review` | Warning `#F5A524` | Revisão humana, conflito, lacuna ou baixa confiança |
| `ai.inferred` | Info `#3B82F6` | Inferência ou recomendação do modelo |
| `ai.uncertain` | Slate `#5B6472` | Estado inconclusivo ou ausência de evidência |
| `ai.blocked` | Error `#EF4444` | Operação bloqueada por policy, budget ou segurança |

## 4. Mapeamento para shadcn/ui

### 4.1. Tokens compatíveis com `globals.css`

O arquivo `domus-design-tokens.css` entregue junto desta especificação contém variáveis HSL compatíveis com os componentes shadcn/ui.

| Token shadcn | Token Domus | Light | Dark |
|---|---|---|---|
| `--background` | `surface.subtle` | Cloud | Midnight |
| `--foreground` | `text.primary` | Ink | Neutral 50 |
| `--card` | `surface.default` | White | Deep Night |
| `--primary` | `brand.primary` | Beta Blue | Beta Blue |
| `--primary-hover` | `brand.primary.hover` | Blue 700 | Beta Cyan |
| `--secondary` | `neutral.100` | Slate 100 | Graphite |
| `--muted-foreground` | `text.muted` | Slate | Neutral 300 |
| `--accent` | `surface.interactive` | Neutral 200 | Dark interactive neutral |
| `--destructive` | `state.error.strong` | Red 700 | Error |
| `--border` | `border.default` | Neutral 200 | Dark border |
| `--input` | `border.strong` | Neutral 300 | Neutral 600 |
| `--ring` | `brand.primary` | Beta Blue | Beta Cyan |

### 4.2. Button

O componente `Button` deve usar somente variantes que expressem ação, não marca decorativa.

| Variante | Background | Texto | Uso |
|---|---|---|---|
| `default` | `--primary` | `--primary-foreground` | Ação principal, confirmar, buscar, publicar |
| `secondary` | `--secondary` | `--secondary-foreground` | Ação alternativa de baixo risco |
| `outline` | Transparente | `--foreground` | Ação secundária em superfícies claras |
| `ghost` | Transparente → `--accent` | `--accent-foreground` | Ações de navegação e contexto |
| `destructive` | `--destructive` | Branco | Excluir, revogar, bloquear ou cancelar operação irreversível |
| `link` | Transparente | `--primary` | Navegação textual e referências |

**Proibição automatizável:** componentes que contenham `Button`, `button` ou variantes de botão não devem usar `bg-indigo-*`, `bg-violet-*`, `brand-depth`, `brand-secondary`, `#271BAE` ou `#310AE3` em background, hover, active ou borda ativa. A restrição deve ser validada por lint, teste de snapshot e revisão visual.

### 4.3. Componentes base

| Componente shadcn/ui | Customização Domus | Uso principal |
|---|---|---|
| `Button` | Variantes sem Indigo/Violeta, foco Beta Blue, estados de loading e confirmação | Ações e navegação |
| `Badge` | Variantes funcionais e estados semânticos da IA | Status, proveniência, confiança e vigência |
| `Alert` | Callouts com ícone, título, descrição e próxima ação | Bloqueios, avisos, conflitos e limitações |
| `Card` | Superfície neutra, borda sutil, densidade configurável | KPIs, resposta, fonte e insight |
| `Dialog` | Action Review e confirmação de operações críticas | Consentimento e escrita externa |
| `Sheet` | Inspector de evidência e painel lateral de proveniência | Fonte, claim, versão e owner |
| `Tooltip` / `Popover` | Explicação curta e inspeção progressiva | Metadados e ajuda contextual |
| `Table` | Densidade `default`/`compact`, headers fixos e estados de linha | Workbenches e governança |
| `Tabs` | Navegação de evidência, versões e áreas de trabalho | Contextos paralelos sem perder localização |
| `Command` | Busca global e ações de teclado | Navegação e intenção de tarefa |
| `DropdownMenu` | Ações de baixo risco; ações destrutivas exigem Dialog | Menus contextuais |
| `Sheet` | Painel de contexto sem abandonar a tarefa | Auditoria, Knowledge e Action Review |
| `Skeleton` | Loading que preserva a estrutura | Streaming, ingestão e workbench |
| `Toast` | Confirmações não críticas; nunca substitui erro persistente | Feedback efêmero |
| `Select` | Opções tipadas, não vazias e ordenadas alfabeticamente | Filtros, owners, workspaces e modelos |

### 4.4. Componentes compostos Domus

| Componente | Composição | Propósito |
|---|---|---|
| `AiSemanticBadge` | `Badge + Icon + Tooltip` | Estado epistemológico da resposta |
| `AiResponseCard` | `Card + AiSemanticBadge + CitationPill + ActionBar` | Resposta de chat com confiança e ações seguras |
| `CitationPill` | `Button variant=link + Badge` | Referência inline a evidência |
| `EvidenceSheet` | `Sheet + Tabs + ScrollArea + Badge` | Trecho, versão, owner, vigência e conflito |
| `SourceFreshnessBadge` | `Badge + Tooltip` | Frescor e estado de revisão da fonte |
| `ActionReviewDialog` | `Dialog + Alert + Table + Button` | Intenção, parâmetros, risco, alçada e confirmação |
| `PolicyDecisionBanner` | `Alert + Icon + Link` | Permitido, negado, condicionado ou bloqueado |
| `BudgetMeter` | `Progress + Badge + Tooltip` | Consumo, reserva, limite e alerta |
| `InsightCard` | `Card + Badge + EvidenceSheet` | Insight com fato, inferência, impacto e owner |
| `KnowledgeAssetRow` | `TableRow + Badge + DropdownMenu` | Fonte, owner, versão, classificação e vigência |
| `StreamingIndicator` | `Skeleton + Icon + aria-live` | Processamento e resposta incremental |
| `EmptyStateWithNextAction` | `Card + Icon + Button/Link` | Ausência de evidência, gap ou conteúdo |

## 5. Estados semânticos da IA

A interface deve usar o mesmo estado retornado pelo contrato de API. Não é permitido inferir estado apenas pelo conteúdo textual da resposta no frontend.

| Estado | Ícone Lucide sugerido | Tom | Rótulo obrigatório | Próxima ação |
|---|---|---|---|---|
| **Fundamentada** | `ShieldCheck` | Success | “Fundamentada” | Inspecionar fonte |
| **Parcial** | `CircleAlert` | Warning | “Parcial” | Revisar lacunas |
| **Conflitante** | `GitCompareArrows` | Warning | “Conflitante” | Consultar owners |
| **Inferida** | `Sparkles` | Info | “Inferida” | Ver premissas |
| **Sem evidência** | `FileQuestion` | Muted | “Sem evidência” | Abrir gap ou refinar busca |
| **Obsoleta** | `ClockAlert` | Warning | “Obsoleta” | Revisar fonte |
| **Bloqueada** | `ShieldX` | Error | “Bloqueada” | Consultar policy/admin |
| **Inconclusiva** | `CircleDashed` | Muted | “Inconclusiva” | Repetir ou investigar |

### 5.1. Regras de representação

A cor nunca pode ser o único indicador. Cada badge ou alert deve conter ícone, texto e, quando necessário, descrição acessível. Estados de erro de infraestrutura devem ser diferentes de estados epistemológicos da IA: “falha do provider” não é equivalente a “sem evidência”, e “bloqueada por policy” não é equivalente a “conflitante”.

A resposta fundamentada mostra citação discreta, sem interromper o fluxo. A resposta conflitante mostra o aviso em linha e permite abrir as fontes lado a lado. A resposta sem evidência deve ser clara e útil, sugerindo busca alternativa ou abertura de gap, sem criar uma falsa resposta.

## 6. Padrões de interação

### 6.1. Chat e `AiResponseCard`

O chat usa largura confortável para leitura, área de resposta com superfície neutra e uma barra de ações secundárias. O estado de streaming deve usar movimento sutil e `aria-live="polite"`; não deve piscar agressivamente nem alterar layout a cada token.

A estrutura recomendada é:

```text
[Semantic Badge] [timestamp] [workspace/context]
Texto da resposta
[CitationPill 1] [CitationPill 2] [estado de evidência]
[Copiar] [Refinar] [Dar feedback] [Propor ação]
```

“Propor ação” nunca equivale a “executar ação”. A execução abre o `ActionReviewDialog`.

### 6.2. `EvidenceSheet`

O painel lateral mostra trecho exato, documento, versão, seção, owner, vigência, classificação e motivo de conflito. Deve aplicar progressive disclosure: o chat permanece limpo; detalhes aparecem ao clicar na citação.

O frontend não deve renderizar placeholders para dados que a API omitiu por RLS. Em vez disso, deve usar “Informação restrita pela política” sem revelar título, existência ou tamanho de conteúdo protegido.

### 6.3. `ActionReviewDialog`

A confirmação deve seguir quatro blocos: intenção, destino, parâmetros, impacto/alçada. Parâmetros sensíveis devem aparecer redigidos; o usuário deve conseguir diferenciar o que será enviado do que foi sugerido pelo modelo.

Operações destrutivas ou de alto impacto exigem confirmação explícita de intenção e escopo. A tela deve apresentar estado de execução, recibo, idempotency key quando apropriado e resultado `sucesso`, `falha` ou `inconclusivo`.

### 6.4. Workbenches e dashboards

O `Knowledge Workbench` prioriza triagem: status, owner, vigência, conflito, frescor, classificação e próxima revisão. O `Intelligence Workbench` prioriza impacto: briefing, sinal, evidência, confidence, premissas e feedback. O painel administrativo prioriza controle: policy, budget, provider, auditoria e SLO.

Cada tabela deve suportar as densidades:

| Densidade | Linha | Célula vertical | Uso |
|---|---:|---:|---|
| `default` | `48px` | `12px` | Usuário geral e leitura confortável |
| `compact` | `36px` | `8px` | Analistas, workbenches e alta densidade |

Cards e tabelas não devem usar gradiente de marca em áreas densas. Indigo/Violeta podem aparecer em navegação profunda ou cabeçalho institucional, nunca em controles acionáveis.

### 6.5. Selects, filtros e listas

Os itens de `Select` devem possuir valores não vazios e estáveis. Placeholder é estado do valor selecionado, não um `Select.Item` vazio. Listas de owners, workspaces, providers, fontes e modelos devem ser ordenadas alfabeticamente, exceto quando a ordenação por prioridade, risco ou recência for explicitamente indicada no rótulo.

## 7. Tipografia, espaçamento, forma e movimento

| Categoria | Decisão Domus |
|---|---|
| **Família** | Inter ou Geist Sans para UI; Geist Mono/IBM Plex Mono para IDs, tokens, logs e parâmetros técnicos. |
| **Escala** | `text-xs` para metadados compactos; `text-sm` para tabelas; `text-base` para resposta; `text-lg`/`text-xl` para títulos de área. |
| **Peso** | 400 corpo; 500 labels; 600 títulos de cards; 700 apenas para hierarquia forte. |
| **Grid** | Base de 4px; espaçamentos de 4, 8, 12, 16, 20, 24, 32 e 48px. |
| **Raio** | `0.65rem` base; controles menores usam `0.5rem`; cards não devem parecer excessivamente arredondados. |
| **Sombra** | `shadow-sm` por padrão; `shadow-md` apenas em popover/dialog; sem sombras em cada linha de tabela. |
| **Foco** | Anel de 2px em Beta Blue/Cyan com offset visível. |
| **Movimento** | 150–200ms para interação; streaming contínuo e sutil; respeitar `prefers-reduced-motion`. |
| **Ícones** | Lucide, tamanho 16px em densidade compacta e 20px em controles padrão; sempre acompanhado de label quando o significado não for universal. |

## 8. Acessibilidade, segurança e qualidade

O design system deve ser testado como parte do CI/CD. A meta é WCAG 2.2 AA, com contraste mínimo de 4,5:1 para texto normal e 3:1 para componentes de interface ou texto grande. Os pares principais foram calculados para validar a base: Beta Blue sobre branco alcança aproximadamente 4,85:1; branco sobre Beta Blue alcança aproximadamente 4,85:1; Ink sobre Cloud alcança aproximadamente 16,68:1; e branco sobre Error Strong alcança aproximadamente 6,47:1.

Os seguintes gates são obrigatórios:

1. O teste automatizado deve bloquear Button com Indigo ou Violeta em background, hover, active ou borda ativa.
2. axe-core ou equivalente deve rodar nos componentes compostos e nas jornadas Chat, Evidence, Knowledge Workbench e Action Review.
3. Playwright deve testar teclado, foco, leitor de tela quando aplicável, zoom de 200%, viewport pequeno e `prefers-reduced-motion`.
4. Snapshot visual deve cobrir light/dark, estados semânticos, `default`/`compact` e erro/bloqueio.
5. Contratos de API devem tipar estados semânticos, fontes, evidências, claims e ações; a UI não deve criar estados próprios.
6. Dados omitidos por RLS não podem aparecer em tooltips, `aria-label`, analytics, logs do navegador ou payloads de telemetria.

## 9. Estrutura recomendada no repositório

```text
src/
  components/
    ui/                         # componentes shadcn/ui mantidos pelo produto
    domus/
      ai-semantic-badge.tsx
      ai-response-card.tsx
      citation-pill.tsx
      evidence-sheet.tsx
      action-review-dialog.tsx
      policy-decision-banner.tsx
      budget-meter.tsx
      insight-card.tsx
      source-freshness-badge.tsx
      streaming-indicator.tsx
  lib/
    domus-design-tokens.ts
    domus-button-variants.ts
    semantic-state.ts
  styles/
    globals.css
    domus-design-tokens.css
  tests/
    design-system-a11y.spec.ts
    design-system-color-guard.spec.ts
    semantic-states.spec.ts
```

Os componentes shadcn/ui devem ser instalados e versionados no repositório, com customizações explícitas. Não criar um pacote paralelo com wrappers opacos para todos os componentes; usar componentes compostos Domus somente onde houver comportamento de negócio, proveniência, segurança ou estado de IA.

## 10. Ordem de implementação

| Fase | Entrega | Dependências |
|---|---|---|
| **D0 — Tokens** | CSS variables, HSL, light/dark, escalas, tipografia, densidade e guardrail de botão | Paleta BetaUp e PRD |
| **D1 — Primitivos** | Button, Badge, Alert, Card, Input, Select, Table, Dialog, Sheet, Tooltip, Tabs e Command | D0 |
| **D2 — Acessibilidade** | Foco, contraste, teclado, reduced motion, axe e snapshots | D1 |
| **D3 — Confiança** | AiSemanticBadge, CitationPill, EvidenceSheet, AiResponseCard e StreamingIndicator | D1–D2 + contratos de estado |
| **D4 — Governança** | PolicyDecisionBanner, BudgetMeter, SourceFreshnessBadge, KnowledgeAssetRow e Workbench Table | D1–D3 + APIs |
| **D5 — Ação** | ActionReviewDialog, receipts, status de execução e confirmação proporcional | D1–D4 + Action Gateway |
| **D6 — Handoff** | documentação, exemplos, Storybook, checklist e treinamento do time | D0–D5 |

## 11. Critérios de aceite do design system

### Cenário 1 — Restrição de cor nos botões

**Dado** um `Button` de qualquer variante, **quando** seus estilos forem compilados ou renderizados, **então** não conterá `#271BAE`, `#310AE3`, `bg-indigo-*`, `bg-violet-*`, `brand-depth` ou `brand-secondary` em background, hover, active ou borda ativa.

### Cenário 2 — Estado de resposta da IA

**Dado** uma resposta com estado semântico, **quando** o componente for renderizado, **então** mostrará label, ícone, cor, descrição acessível e próxima ação, sem depender exclusivamente da cor.

### Cenário 3 — Evidência autorizada

**Dado** uma citação inline, **quando** o usuário abrir o `EvidenceSheet`, **então** verá somente trecho, versão, seção, owner e vigência autorizados pelo contrato e RLS.

### Cenário 4 — Ação governada

**Dado** uma recomendação de escrita externa, **quando** o usuário abrir o `ActionReviewDialog`, **então** verá intenção, destino, parâmetros redigidos, impacto, risco e alçada antes de qualquer execução.

### Cenário 5 — Acessibilidade

**Dado** usuário que navega por teclado em viewport de 200% de zoom, **quando** acessar tabela, sheet, dialog, select e chat, **então** o foco permanecerá visível, a ordem será lógica e nenhum conteúdo crítico dependerá de cor, hover ou movimento.

### Cenário 6 — Select seguro

**Dado** um `Select` com placeholder, **quando** a lista for renderizada, **então** nenhum `Select.Item` terá `value` vazio; o placeholder será controlado pelo valor selecionado e as opções serão ordenadas conforme o critério declarado.

## 12. Artefatos entregues

| Arquivo | Conteúdo |
|---|---|
| `domus-design-tokens.css` | Variáveis CSS/HSL para shadcn/ui, light/dark, estados, IA, densidade e gradientes de marca. |
| `domus-design-tokens.ts` | Tokens tipados, estados semânticos, metadados de ícones, densidade e guardrail de cor de Button. |
| `domus-button-variants.ts` | Variantes `cva` de Button sem Indigo/Violeta em estados interativos. |
| `DESIGN_SYSTEM_DOMUS_CORP.md` | Esta especificação, inventário de componentes, regras, padrões, acessibilidade, critérios e roadmap. |

## 13. Referências

[1]: https://github.com/shadcn-ui/ui "shadcn/ui — repositório oficial"  
[2]: ./upload/beta_up_design_tokens_palette.md "BetaUp Soluções — Paleta expandida e tokens de cor"  
[3]: ./PRD_DomusCorp.md "PRD — Domus Corp v1.0"  
[4]: ./ADR_001_ArquiteturaDomusCorp.md "ADR-001 — Arquitetura do Domus Corp"  
[5]: ./Backlog_V1_DomusCorp.md "Backlog Mestre de Issues — Domus Corp v1.0"
