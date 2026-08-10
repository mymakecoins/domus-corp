# Documento de Design — Issue V1-207: Experiência de Citações, Evidências e Proveniência na UI

**Data:** 10/08/2026  
**Issue:** V1-207 — Experiência de citações, evidências e proveniência na UI (CitationPill, EvidenceSheet, badge de estados semânticos no cliente desktop/React)  
**Marco:** M2–M3 (Onda 5)  
**Prioridade:** P0  
**Status:** Aprovado para Implementação  

---

## 1. Visão Geral e Objetivos

A issue V1-207 visa entregar a experiência de auditoria de proveniência e confiança do Domus Corp na interface de usuário (React / Electron desktop app e `@domus/ui`).
Quando a IA gera uma resposta fundamentada ou parcial, o usuário deve ser capaz de inspecionar detalhadamente as fontes citadas, verificar a vigência da evidência, comparar fontes conflitantes lado a lado e garantir que dados fora de alçada (escopo/RLS) não sejam vazados.

### Critérios de Aceite Atendidos (do Backlog V1):
1. **Afirmação Factual e CitationPill:** Ao clicar na `CitationPill`, o `EvidenceSheet` exibe o trecho exato, documento, versão, seção, owner e vigência autorizados.
2. **Fonte Obsoleta ou Conflitante:** O `SourceFreshnessBadge` e alertas visuais aparecem indicando divergências ou obsolescência, preservando as fontes lado a lado para comparação.
3. **Proteção de Escopo Fail-Closed:** Se uma evidência for restrita ou fora de alçada, a UI exibe o banner de bloqueio sem vazar trecho, título, tooltip, `aria-label` ou metadados protegidos.
4. **Acessibilidade e Layouts:** Navegação por teclado, foco restrito (trap focus), leitores de tela (`aria-live`, `aria-label`), temas light/dark, densidades default/compact e zoom 200% validados via axe-core.

---

## 2. Arquitetura e Estrutura de Componentes

### 2.1. Tipos e Interfaces (`packages/ui/src/tokens.ts` / `packages/ui/src/components.tsx`)

```typescript
export type FreshnessStatus = 'vigente' | 'obsoleta' | 'conflitante' | 'restrita';

export interface EvidenceSource {
  id: string;
  documentTitle: string;
  versionId: string;
  sectionLocator: string;
  excerpt?: string;
  owner?: string;
  validityPeriod?: { start?: string; end?: string };
  freshnessStatus: FreshnessStatus;
  classification?: string;
  accessRestricted?: boolean;
}

export interface CitationItem {
  id: string;
  refCode: string;
  label: string;
  status?: FreshnessStatus;
  primaryEvidence?: EvidenceSource;
  conflictingEvidences?: EvidenceSource[];
}
```

### 2.2. Componente `SourceFreshnessBadge`
Mapeia os 4 estados visuais de frescor/proveniência:
- `vigente` (stale=false): Tone `success`, ícone `ShieldCheck`, label `"Fonte vigente"`.
- `obsoleta` (stale=true): Tone `warning`, ícone `ClockAlert`, label `"Revisão necessária"`.
- `conflitante`: Tone `warning`, ícone `GitCompareArrows`, label `"Fontes divergentes"`.
- `restrita`: Tone `error`/`muted`, ícone `ShieldX`, label `"Acesso restrito / Fora de alçada"`.

### 2.3. Componente `CitationPill`
Botão interativo semântico integrado ao design system `@domus/ui`:
- Renderiza o código da citação (ex: `[1]`, `[POL-03]`) com suporte a ícones de proveniência.
- Suporta callback `onClick` para acionar a exibição do `EvidenceSheet`.
- Fornece `aria-label` seguro para leitores de tela sem expor conteúdo restrito.

### 2.4. Componente `EvidenceSheet`
Painel lateral slide-over baseado no primitivo Radix UI `Sheet` / `Dialog`:
- **Cabeçalho:** Título da citação, `SourceFreshnessBadge` e `AiSemanticBadge`.
- **Guardrail de Escopo:** Para evidências com `accessRestricted: true` ou status `restrita`, exibe o `PolicyDecisionBanner` (decisão `denied`) informando a restrição de alçada sem expor trechos ou títulos protegidos.
- **Trecho de Evidência:** Exibição do fragmento textual demarcado.
- **Tabela de Metadados:** Documento, versão, seção/página, owner e período de vigência.
- **Modo Comparativo de Conflitos:** Abas (`Tabs`) para inspeção lado a lado da **Fonte Principal** vs **Fonte Conflitante**.
- **Ações:** Botões para cópia de link de proveniência e deep link seguro.

---

## 3. Integração no Cliente Desktop (`apps/desktop/src/renderer/main.tsx`)

- O estado do componente principal `App` gerencia a citação ativa (`activeCitation`).
- As respostas renderizadas no `AiResponseCard` expõem as `CitationPill`s interativas.
- Ao clicar em uma pílula, o `EvidenceSheet` abre exibindo a evidência selecionada.
- Inclui dados sintéticos / fixtures de demonstração para os 4 cenários (vigente, obsoleta, conflito e restrita).

---

## 4. Testes e Validação de Qualidade

1. **Testes Unitários & Contratos (`packages/ui/test/contracts.test.ts`):** Validação dos componentes `CitationPill`, `EvidenceSheet` e `SourceFreshnessBadge`.
2. **Acessibilidade (`packages/ui/test/accessibility.test.tsx`):** Validação axe-core nos temas `light` e `dark`, garantindo conformidade WCAG 2.2 AA.
3. **Guardrails de Estilo (`assertButtonClassesAllowed`):** Verificação rigorosa contra uso de cores proibidas (`indigo`, `violet`).
4. **Build & Suíte Global (`pnpm test`):** Compilação e execução de testes em todo o monorepo.
