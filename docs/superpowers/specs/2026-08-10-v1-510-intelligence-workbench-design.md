# Design Specification: Intelligence Workbench UI (V1-510)

**Data:** 2026-08-10  
**Status:** Aprovado  
**Issue:** V1-510 — Criar Intelligence Workbench para gestores e direção  
**Marco:** M3 | **Prioridade:** P1  
**Repositório / Branch:** `domus-corp` (`develop`)  

---

## 1. Visão Geral e Objetivos

O **Intelligence Workbench** é a interface centralizada destinada a gestores corporativos e membros da diretoria para visualização, triagem e tomada de decisão fundamentada com base nos sinais do **Intelligence Plane (E5)**.

### Objetivos Principais
1. **Separação Tríplice da Informação:** Exibir para cada item/insight a clara distinção entre **Dado Observado (Fato)**, **Interpretação do Modelo (Inferência)** e **Ação Proposta (Recomendação)**.
2. **Triagem por Escopo e Urgência:** Apresentar apenas dados autorizados ao escopo do gestor, ordenados por severidade/impacto (`alta`, `media`, `baixa`) e com indicação clara de confiança (`alta`, `media`, `baixa`).
3. **Inspeção de Evidências (`EvidenceSheet`):** Permitir a expansão de qualquer insight ou briefing para examinar fontes originais, premissas, autor, vigência e estado de frescor (`SourceFreshnessBadge`).
4. **Silenciamento de Notificações:** Oferecer gestão de preferências para silenciar alertas não críticos sem afetar avisos obrigatórios de segurança, RLS ou orçamento.
5. **Acessibilidade e Densidade Declarada:** Oferecer alternância entre as densidades `default` e `compact`, suporte completo a temas Light/Dark e acessibilidade WCAG 2.2 AA (navegação por teclado, rótulos ARIA e indicadores visuais não dependentes unicamente de cor).

---

## 2. Arquitetura e Estrutura de Componentes

### 2.1 Localização no Código
- **Componentes Reutilizáveis:** `packages/ui/src/components.tsx` e `packages/ui/src/tokens.ts`.
- **Aplicação Admin/Workbench:** `apps/admin/src/intelligence-workbench.tsx`.
- **Registro no Main:** `apps/admin/src/main.tsx`.

### 2.2 Divisão em Abas (Modular Tabs)
O workbench será estruturado em 4 seções principais:
1. **Insights Operacionais (`insights`):** Cards compostos usando `InsightCard`, `AiSemanticBadge`, badges de fato/inferência/recomendação e acionamento de `EvidenceSheet`.
2. **Briefings Executivos (`briefings`):** Geração on-demand de briefings por papel e workspace, com resumos de mudanças e pendências.
3. **Gaps & Mudanças de Conhecimento (`gaps-changes`):** Tabela de triagem para lacunas recuperadas sem evidência e detecção de alterações em normas/políticas.
4. **Preferências & Notificações (`settings`):** Configuração de notificações silenciadas e periodicidade de briefings.

---

## 3. Tipos e Contratos de Dados

```typescript
export type SeverityLevel = 'alta' | 'media' | 'baixa';
export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

export interface TripartiteInformation {
  fact: string; // Dado factual observado
  inference: string; // Interpretação/dedução da IA
  recommendation: string; // Recomendação de ação
}

export interface IntelligenceInsightItem {
  id: string;
  title: string;
  tenantId: string;
  workspaceId: string;
  state: AiSemanticState; // 8 estados semânticos
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  tripartite: TripartiteInformation;
  sourceId: string;
  sourceTitle: string;
  versionId: string;
  owner: string;
  validityEnd?: string;
  status: 'draft' | 'reviewed' | 'published' | 'archived';
  citation?: CitationItem;
  createdAt: string;
}

export interface ExecutiveBriefingItem {
  id: string;
  title: string;
  role: string;
  timeWindow: string;
  summary: string;
  changesCount: number;
  gapsCount: number;
  insightsCount: number;
  generatedAt: string;
  citations: CitationItem[];
}

export interface MutePreferences {
  muteNonCritical: boolean;
  mutedCategories: string[];
}
```

---

## 4. Requisitos de UX, Acessibilidade e Guardrails do Design System

1. **Guardrail de Botões:** Nenhum botão pode utilizar classes proibidas (`bg-indigo`, `bg-violet`, `#271bae`, `#310ae3`). Todos usam os componentes `Button` do `@domus/ui`.
2. **Selects:** Todos os componentes `Select` possuem `aria-label` descritivo e opções não vazias com ordenação previsível.
3. **Densidade:** Suporte a `DOMUS_DENSITIES.default` e `DOMUS_DENSITIES.compact` com espaçamento ajustado via token.
4. **Leitor de Tela e Teclado:** Todas as ações interativas possuem foco visível (`focus-visible`), atributo `aria-label` e estados anunciados via `aria-live`.

---

## 5. Estratégia de Fallback e Integração com API

O cliente de API `IntelligenceClient` consumirá os endpoints REST da `knowledge-api`:
- `GET /intelligence/insights`
- `POST /intelligence/insights/{id}/review`
- `POST /intelligence/insights/{id}/feedback`
- `GET /intelligence/briefings`
- `POST /intelligence/briefings/generate`
- `POST /intelligence/briefings/preferences`
- `GET /intelligence/changes`
- `GET /v1/knowledge-gaps`

Quando a sessão estiver em estado `UNAVAILABLE` ou a chamada de API falhar/retornar timeout, o client acionará o fallback seguro com dados de demonstração corporativos tipados, garantindo resiliência operacional sem crash de UI.

---

## 6. Plano de Testes e Validação de Qualidade

1. **Testes Unitários:** Testar renderização dos componentes, filtragem por escopo, alternância de densidade e modal de preferências.
2. **Validação de Guardrails:** Executar `assertButtonClassesAllowed` e validação de acessibilidade.
3. **Snapshots de UI:** Testes de regressão visual.
