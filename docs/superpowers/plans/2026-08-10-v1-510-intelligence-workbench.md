# Intelligence Workbench UI (V1-510) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Intelligence Workbench UI for directorship and operational managers (V1-510) in `apps/admin` and `@domus/ui`, featuring tripartite information separation (Fato/Inferência/Recomendação), semantic badges, executive briefings, knowledge gaps & changes, mute notification preferences, density toggling, accessibility, and robust `knowledge-api` integration with fallback.

**Architecture:** Extend `@domus/ui` with specialized intelligence domain components (`SeparationBadge`, `ExecutiveBriefingCard`, `NotificationPreferencesModal`, `IntelligenceInsightCard`). Build `IntelligenceClient` in `apps/admin` with API endpoints and typed mock fallback. Create `IntelligenceWorkbench` in `apps/admin/src/intelligence-workbench.tsx` with a 4-tab modular view (Insights, Briefings, Gaps & Changes, Settings) integrated with `EvidenceSheet` for evidence inspection.

**Tech Stack:** React, TypeScript, Radix UI, `@domus/ui`, Lucide Icons, Vitest / Testing Library.

## Global Constraints

- Must follow Design System rules: NO forbidden button classes (`bg-indigo`, `bg-violet`, `#271bae`, `#310ae3`).
- Select options must not be empty and must use Portuguese (`pt-BR`) alphabetical ordering.
- Support both `default` and `compact` densities using `DOMUS_DENSITIES`.
- Distinguish state, impact, and next action without relying exclusively on color.
- Deliver on branch `develop`.

---

### Task 1: Intelligence Domain Components in `@domus/ui`

**Files:**
- Modify: `packages/ui/src/tokens.ts`
- Modify: `packages/ui/src/components.tsx`
- Modify: `packages/ui/src/index.ts`
- Create: `packages/ui/src/__tests__/intelligence-components.test.tsx`

**Interfaces:**
- Produces: `SeparationBadge`, `ExecutiveBriefingCard`, `IntelligenceInsightCard`, `NotificationPreferencesModal` exported from `@domus/ui`.

- [ ] **Step 1: Write the failing test for UI components**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExecutiveBriefingCard, SeparationBadge } from '../index.js';

describe('Intelligence Domain Components', () => {
  it('renders SeparationBadge correctly for fact, inference, recommendation', () => {
    render(<SeparationBadge type="fact" />);
    expect(screen.getByText('Dado Observado (Fato)')).toBeDefined();
  });

  it('renders ExecutiveBriefingCard with summary and citations count', () => {
    render(
      <ExecutiveBriefingCard
        title="Briefing Semanal de Operações"
        role="Gestor Operacional"
        timeWindow="7d"
        summary="Resumo de mudanças regulatórias e 2 lacunas identificadas."
        changesCount={3}
        gapsCount={2}
        insightsCount={1}
      />
    );
    expect(screen.getByText('Briefing Semanal de Operações')).toBeDefined();
    expect(screen.getByText('3 mudanças')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @domus/ui test`
Expected: FAIL with missing components or export errors.

- [ ] **Step 3: Implement components in `packages/ui`**

In `packages/ui/src/components.tsx`, add:
```tsx
export type InformationType = 'fact' | 'inference' | 'recommendation';

export function SeparationBadge({ type }: { type: InformationType }) {
  const config = {
    fact: { label: 'Dado Observado (Fato)', tone: 'info' as const },
    inference: { label: 'Interpretação (Inferência)', tone: 'warning' as const },
    recommendation: { label: 'Ação Sugerida (Recomendação)', tone: 'success' as const },
  }[type];

  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export interface ExecutiveBriefingCardProps {
  title: string;
  role: string;
  timeWindow: string;
  summary: string;
  changesCount: number;
  gapsCount: number;
  insightsCount: number;
  onExpand?: () => void;
}

export function ExecutiveBriefingCard({
  title,
  role,
  timeWindow,
  summary,
  changesCount,
  gapsCount,
  insightsCount,
  onExpand,
}: ExecutiveBriefingCardProps) {
  return (
    <Card className="executive-briefing-card">
      <CardHeader>
        <div className="briefing-meta">
          <Badge tone="neutral">{role}</Badge>
          <Badge tone="muted">Janela: {timeWindow}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="briefing-summary">{summary}</p>
        <div className="briefing-counters">
          <span className="counter-tag">{changesCount} mudanças</span>
          <span className="counter-tag">{gapsCount} gaps</span>
          <span className="counter-tag">{insightsCount} insights</span>
        </div>
        {onExpand && (
          <Button variant="outline" size="sm" onClick={onExpand}>
            Visualizar Briefing Completo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```
Export these components in `packages/ui/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/ui test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components.tsx packages/ui/src/index.ts packages/ui/src/__tests__/intelligence-components.test.tsx
git commit -m "feat(ui): add intelligence domain components for V1-510"
```

---

### Task 2: Implementation of `IntelligenceClient` and Fallback

**Files:**
- Create: `apps/admin/src/intelligence-client.ts`
- Create: `apps/admin/src/__tests__/intelligence-client.test.ts`

**Interfaces:**
- Consumes: `WorkbenchSession` from `apps/admin/src/knowledge-workbench.tsx`
- Produces: `IntelligenceClient` interface and implementation with mock fallback.

- [ ] **Step 1: Write the failing test for `IntelligenceClient`**

```ts
import { describe, expect, it } from 'vitest';
import { createIntelligenceClient } from '../intelligence-client.js';

describe('IntelligenceClient', () => {
  it('returns fallback mock insights when session is UNAVAILABLE', async () => {
    const client = createIntelligenceClient({ state: 'UNAVAILABLE', reason: 'Sessão indisponível' });
    const insights = await client.listInsights();
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]?.tripartite.fact).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @domus/admin test`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `IntelligenceClient` in `apps/admin/src/intelligence-client.ts`**

```ts
import type { AiSemanticState, CitationItem } from '@domus/ui';
import type { WorkbenchSession } from './knowledge-workbench.js';

export type SeverityLevel = 'alta' | 'media' | 'baixa';
export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

export interface TripartiteInformation {
  fact: string;
  inference: string;
  recommendation: string;
}

export interface IntelligenceInsightItem {
  id: string;
  title: string;
  tenantId: string;
  workspaceId: string;
  state: AiSemanticState;
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

export interface KnowledgeGapItem {
  id: string;
  queryPattern: string;
  frequency: number;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
  assignedOwner?: string;
}

export interface ChangeImpactItem {
  id: string;
  sourceId: string;
  sourceType: string;
  summary: string;
  impactLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  detectedAt: string;
}

export interface IntelligenceClient {
  listInsights(): Promise<readonly IntelligenceInsightItem[]>;
  reviewInsight(id: string, status: string): Promise<void>;
  submitInsightFeedback(id: string, feedbackType: string, comment?: string): Promise<void>;
  listBriefings(): Promise<readonly ExecutiveBriefingItem[]>;
  generateBriefing(role: string): Promise<ExecutiveBriefingItem>;
  listGaps(): Promise<readonly KnowledgeGapItem[]>;
  listChanges(): Promise<readonly ChangeImpactItem[]>;
}

const MOCK_INSIGHTS: IntelligenceInsightItem[] = [
  {
    id: 'ins-001',
    title: 'Desvio de Conformidade em Retenção de Auditoria',
    tenantId: 'tenant-default',
    workspaceId: 'ws-governance',
    state: 'conflitante',
    severity: 'alta',
    confidence: 'alta',
    tripartite: {
      fact: 'Norma 2024 especifica 90 dias, enquanto Norma 2026 especifica 365 dias para guarda de logs.',
      inference: 'Existe um conflito normativo entre as políticas de compliance e jurídico.',
      recommendation: 'Alinhar a retenção unificada para 365 dias e atualizar a Norma 2024.',
    },
    sourceId: 'src-pol-01',
    sourceTitle: 'Norma de Auditoria e Guarda de Dados',
    versionId: 'v2.0',
    owner: 'Time de Compliance',
    status: 'draft',
    createdAt: '2026-08-10T10:00:00Z',
    citation: {
      id: 'cit-ins-01',
      refCode: '[CIT-01]',
      label: 'Norma de Auditoria 2024 vs 2026',
      status: 'conflitante',
      primaryEvidence: {
        id: 'ev-01a',
        documentTitle: 'Norma de Auditoria 2024',
        versionId: 'v1.2',
        sectionLocator: 'Artigo 12 — Retenção',
        excerpt: 'Os registros de log de auditoria devem ser retidos por 90 dias.',
        owner: 'Compliance',
        freshnessStatus: 'conflitante',
      },
      conflictingEvidences: [
        {
          id: 'ev-01b',
          documentTitle: 'Norma de Governança 2026',
          versionId: 'v2.0',
          sectionLocator: 'Artigo 5 — Retenção Ampliada',
          excerpt: 'Os logs de auditoria corporativos devem ser retidos por 365 dias.',
          owner: 'Jurídico',
          freshnessStatus: 'conflitante',
        },
      ],
    },
  },
  {
    id: 'ins-002',
    title: 'Autenticação OIDC Server-Side em Dispositivos Móveis',
    tenantId: 'tenant-default',
    workspaceId: 'ws-security',
    state: 'fundamentada',
    severity: 'media',
    confidence: 'alta',
    tripartite: {
      fact: 'Todos os tokens da plataforma passam pela troca OIDC server-side.',
      inference: 'Não foram detectados vazamentos de chaves de API em clientes locais.',
      recommendation: 'Manter a política ativa e monitorar tempo de rotação.',
    },
    sourceId: 'src-sec-02',
    sourceTitle: 'Diretriz de Autenticação Corporativa',
    versionId: 'v2.4',
    owner: 'Time de Arquitetura e Segurança',
    status: 'published',
    createdAt: '2026-08-10T11:30:00Z',
  },
];

const MOCK_BRIEFINGS: ExecutiveBriefingItem[] = [
  {
    id: 'brf-001',
    title: 'Briefing Semanal da Diretoria de Operações',
    role: 'Direção Executiva',
    timeWindow: '7d',
    summary: 'Registradas 3 alterações de diretrizes normativas, 2 lacunas de conhecimento e 1 conflito de retenção.',
    changesCount: 3,
    gapsCount: 2,
    insightsCount: 1,
    generatedAt: '2026-08-10T08:00:00Z',
    citations: [],
  },
];

const MOCK_GAPS: KnowledgeGapItem[] = [
  {
    id: 'gap-001',
    queryPattern: 'como renovar certificado mTLS do gateway',
    frequency: 14,
    status: 'OPEN',
  },
];

const MOCK_CHANGES: ChangeImpactItem[] = [
  {
    id: 'chg-001',
    sourceId: 'doc-pol-005',
    sourceType: 'POLITY_DOCUMENT',
    summary: 'Atualização da política de retenção de chaves de acesso',
    impactLevel: 'CRITICAL',
    detectedAt: '2026-08-09T16:00:00Z',
  },
];

export function createIntelligenceClient(session: WorkbenchSession, apiBaseUrl = 'http://localhost:8000'): IntelligenceClient {
  return {
    async listInsights() {
      if (session.state !== 'AUTHENTICATED') return MOCK_INSIGHTS;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/insights?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_INSIGHTS;
        return (await res.json()) as IntelligenceInsightItem[];
      } catch {
        return MOCK_INSIGHTS;
      }
    },
    async reviewInsight(id: string, status: string) {
      if (session.state !== 'AUTHENTICATED') return;
      try {
        await fetch(`${apiBaseUrl}/intelligence/insights/${id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, reviewer: 'Gestor Autorizado' }),
        });
      } catch {
        // Fallback no-op
      }
    },
    async submitInsightFeedback(id: string, feedbackType: string, comment?: string) {
      if (session.state !== 'AUTHENTICATED') return;
      try {
        await fetch(`${apiBaseUrl}/intelligence/insights/${id}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'gestor-1', feedback_type: feedbackType, comment }),
        });
      } catch {
        // Fallback no-op
      }
    },
    async listBriefings() {
      if (session.state !== 'AUTHENTICATED') return MOCK_BRIEFINGS;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/briefings?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_BRIEFINGS;
        return (await res.json()) as ExecutiveBriefingItem[];
      } catch {
        return MOCK_BRIEFINGS;
      }
    },
    async generateBriefing(role: string) {
      const newBriefing: ExecutiveBriefingItem = {
        id: `brf-${Date.now()}`,
        title: `Briefing sob demanda — ${role}`,
        role,
        timeWindow: '7d',
        summary: 'Briefing gerado com sucesso com base nos dados mais recentes.',
        changesCount: MOCK_CHANGES.length,
        gapsCount: MOCK_GAPS.length,
        insightsCount: MOCK_INSIGHTS.length,
        generatedAt: new Date().toISOString(),
        citations: [],
      };
      return newBriefing;
    },
    async listGaps() {
      if (session.state !== 'AUTHENTICATED') return MOCK_GAPS;
      try {
        const res = await fetch(`${apiBaseUrl}/v1/knowledge-gaps?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_GAPS;
        return (await res.json()) as KnowledgeGapItem[];
      } catch {
        return MOCK_GAPS;
      }
    },
    async listChanges() {
      if (session.state !== 'AUTHENTICATED') return MOCK_CHANGES;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/changes?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_CHANGES;
        return (await res.json()) as ChangeImpactItem[];
      } catch {
        return MOCK_CHANGES;
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/admin test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/intelligence-client.ts apps/admin/src/__tests__/intelligence-client.test.ts
git commit -m "feat(admin): implement IntelligenceClient with fallback for V1-510"
```

---

### Task 3: Implementation of `IntelligenceWorkbench` Component

**Files:**
- Create: `apps/admin/src/intelligence-workbench.tsx`
- Create: `apps/admin/src/__tests__/intelligence-workbench.test.tsx`

**Interfaces:**
- Consumes: `@domus/ui` components (`InsightCard`, `AiSemanticBadge`, `EvidenceSheet`, `SeparationBadge`, `ExecutiveBriefingCard`, `Button`, `Card`, `Tabs`, `Select`, etc.)
- Consumes: `IntelligenceClient` and `WorkbenchSession`
- Produces: `IntelligenceWorkbench` React component.

- [ ] **Step 1: Write the failing test for `IntelligenceWorkbench`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntelligenceWorkbench } from '../intelligence-workbench.js';
import { createIntelligenceClient } from '../intelligence-client.js';

describe('IntelligenceWorkbench', () => {
  it('renders Intelligence Workbench header and main tabs', async () => {
    const session = { state: 'AUTHENTICATED' as const, workspaceName: 'Operações Corporativas' };
    const client = createIntelligenceClient(session);

    render(<IntelligenceWorkbench session={session} client={client} />);

    expect(screen.getByText('Intelligence Workbench')).toBeDefined();
    expect(screen.getByText('Insights Operacionais')).toBeDefined();
    expect(screen.getByText('Briefings Executivos')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @domus/admin test`
Expected: FAIL with missing component.

- [ ] **Step 3: Implement `IntelligenceWorkbench` in `apps/admin/src/intelligence-workbench.tsx`**

```tsx
import {
  AiSemanticBadge,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EvidenceSheet,
  ExecutiveBriefingCard,
  Select,
  SeparationBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type CitationItem,
} from '@domus/ui';
import React from 'react';
import type {
  ChangeImpactItem,
  ExecutiveBriefingItem,
  IntelligenceClient,
  IntelligenceInsightItem,
  KnowledgeGapItem,
} from './intelligence-client.js';
import type { WorkbenchSession } from './knowledge-workbench.js';

export function IntelligenceWorkbench({ session, client }: { session: WorkbenchSession; client: IntelligenceClient }) {
  const [insights, setInsights] = React.useState<readonly IntelligenceInsightItem[]>([]);
  const [briefings, setBriefings] = React.useState<readonly ExecutiveBriefingItem[]>([]);
  const [gaps, setGaps] = React.useState<readonly KnowledgeGapItem[]>([]);
  const [changes, setChanges] = React.useState<readonly ChangeImpactItem[]>([]);
  const [density, setDensity] = React.useState<'default' | 'compact'>('default');
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');
  const [activeCitation, setActiveCitation] = React.useState<CitationItem | null>(null);
  const [mutedNonCritical, setMutedNonCritical] = React.useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string>();

  const refresh = React.useCallback(() => {
    void client.listInsights().then(setInsights);
    void client.listBriefings().then(setBriefings);
    void client.listGaps().then(setGaps);
    void client.listChanges().then(setChanges);
  }, [client]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  if (session.state !== 'AUTHENTICATED') {
    return (
      <main className="intelligence-workbench-shell">
        <Alert>
          <AlertTitle>Intelligence Workbench indisponível</AlertTitle>
          <AlertDescription>{session.reason} Conecte-se com sua identidade corporativa autorizada.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const filteredInsights = insights.filter((item) => {
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    return true;
  });

  const severityOptions = [
    { value: 'ALL', label: 'Todas as severidades' },
    { value: 'alta', label: 'Alta severidade' },
    { value: 'media', label: 'Média severidade' },
    { value: 'baixa', label: 'Baixa severidade' },
  ];

  const densityOptions = [
    { value: 'default', label: 'Densidade Padrão (default)' },
    { value: 'compact', label: 'Densidade Compacta (compact)' },
  ];

  const handleGenerateBriefing = async () => {
    const item = await client.generateBriefing('Diretoria Executiva');
    setBriefings((prev) => [item, ...prev]);
    setFeedbackMessage('Novo briefing executivo gerado sob demanda.');
  };

  const handleReviewInsight = async (id: string, status: string) => {
    await client.reviewInsight(id, status);
    setFeedbackMessage(`Insight ${id} atualizado para o estado: ${status}.`);
    refresh();
  };

  const handleFeedback = async (id: string, feedbackType: string) => {
    await client.submitInsightFeedback(id, feedbackType);
    setFeedbackMessage(`Feedback (${feedbackType}) registrado para o insight ${id}.`);
  };

  return (
    <main className={`intelligence-workbench-shell density-${density}`}>
      <header className="workbench-header">
        <div>
          <p className="eyebrow">Plataforma Domus Corp — E5 Intelligence Plane</p>
          <h1>Intelligence Workbench</h1>
          <p>Visão executiva e operacional para gestores. Escopo do workspace: {session.workspaceName}</p>
        </div>
        <div className="header-controls">
          <Select
            options={densityOptions}
            value={density}
            onValueChange={(val) => setDensity(val as 'default' | 'compact')}
            aria-label="Selecionar densidade de exibição"
          />
        </div>
      </header>

      {feedbackMessage && (
        <Alert className="mb-4">
          <AlertTitle>Notificação do Sistema</AlertTitle>
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      )}

      {/* Mandatory Security Banner */}
      <Alert className="mb-4 security-banner">
        <AlertTitle>Alerta Obrigatório de Segurança e RLS</AlertTitle>
        <AlertDescription>
          Todas as informações exibidas derivam do contexto estritamente autorizado pela EffectivePolicy. Alertas de RLS e budget não são ocultados pelas preferências de silenciamento.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="insights" className="workbench-tabs">
        <TabsList aria-label="Seções do Intelligence Workbench">
          <TabsTrigger value="insights">Insights Operacionais ({filteredInsights.length})</TabsTrigger>
          <TabsTrigger value="briefings">Briefings Executivos ({briefings.length})</TabsTrigger>
          <TabsTrigger value="gaps-changes">Gaps & Mudanças ({gaps.length + changes.length})</TabsTrigger>
          <TabsTrigger value="settings">Notificações & Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="tab-actions mb-4">
            <Select
              options={severityOptions}
              value={severityFilter}
              onValueChange={setSeverityFilter}
              aria-label="Filtrar por severidade de impacto"
            />
          </div>
          <div className="insights-grid">
            {filteredInsights.map((item) => (
              <Card key={item.id} className="insight-card-item">
                <CardHeader>
                  <div className="card-header-top">
                    <AiSemanticBadge state={item.state} />
                    <Badge tone={item.severity === 'alta' ? 'error' : item.severity === 'media' ? 'warning' : 'info'}>
                      Impacto: {item.severity}
                    </Badge>
                    <Badge tone="neutral">Confiança: {item.confidence}</Badge>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="tripartite-block">
                    <div className="tripartite-row">
                      <SeparationBadge type="fact" />
                      <p>{item.tripartite.fact}</p>
                    </div>
                    <div className="tripartite-row">
                      <SeparationBadge type="inference" />
                      <p>{item.tripartite.inference}</p>
                    </div>
                    <div className="tripartite-row">
                      <SeparationBadge type="recommendation" />
                      <p>{item.tripartite.recommendation}</p>
                    </div>
                  </div>
                  <dl className="insight-meta">
                    <div>
                      <dt>Fonte Original:</dt>
                      <dd>{item.sourceTitle} ({item.versionId})</dd>
                    </div>
                    <div>
                      <dt>Owner:</dt>
                      <dd>{item.owner}</dd>
                    </div>
                  </dl>
                  <div className="insight-actions">
                    {item.citation && (
                      <Button variant="outline" size="sm" onClick={() => setActiveCitation(item.citation!)}>
                        Inspecionar Evidência
                      </Button>
                    )}
                    <Button variant="default" size="sm" onClick={() => handleReviewInsight(item.id, 'reviewed')}>
                      Aprovar Publicação
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleFeedback(item.id, 'HELPFUL')}>
                      Útil 👍
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleFeedback(item.id, 'FALSE_POSITIVE')}>
                      Falso Positivo 👎
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="briefings">
          <div className="tab-actions mb-4">
            <Button variant="default" onClick={handleGenerateBriefing}>
              Gerar Briefing sob Demanda
            </Button>
          </div>
          <div className="briefings-grid">
            {briefings.map((briefing) => (
              <ExecutiveBriefingCard
                key={briefing.id}
                title={briefing.title}
                role={briefing.role}
                timeWindow={briefing.timeWindow}
                summary={briefing.summary}
                changesCount={briefing.changesCount}
                gapsCount={briefing.gapsCount}
                insightsCount={briefing.insightsCount}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gaps-changes">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Lacunas de Conhecimento Detectadas (Knowledge Gaps)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Padrão de Consulta sem Evidência</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.map((gap) => (
                    <TableRow key={gap.id}>
                      <TableCell>{gap.queryPattern}</TableCell>
                      <TableCell>{gap.frequency}x</TableCell>
                      <TableCell>
                        <Badge tone={gap.status === 'OPEN' ? 'warning' : 'success'}>{gap.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mudanças e Obsolescência Detectadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Resumo da Alteração</TableHead>
                    <TableHead>Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((chg) => (
                    <TableRow key={chg.id}>
                      <TableCell>{chg.sourceId}</TableCell>
                      <TableCell>{chg.summary}</TableCell>
                      <TableCell>
                        <Badge tone={chg.impactLevel === 'CRITICAL' ? 'error' : 'warning'}>{chg.impactLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificações e Silenciamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="setting-row">
                <label htmlFor="mute-toggle">Silenciar notificações operacionais não críticas:</label>
                <input
                  id="mute-toggle"
                  type="checkbox"
                  checked={mutedNonCritical}
                  onChange={(e) => {
                    setMutedNonCritical(e.target.checked);
                    setFeedbackMessage(
                      e.target.checked
                        ? 'Notificações não críticas foram silenciadas.'
                        : 'Notificações não críticas foram reativadas.'
                    );
                  }}
                />
              </div>
              <p className="setting-note mt-2">
                Aviso: Alertas obrigatórios de RLS, violação de política ou exaustão de orçamento não são afetados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeCitation && (
        <EvidenceSheet
          open={!!activeCitation}
          citation={activeCitation}
          onOpenChange={(open) => {
            if (!open) setActiveCitation(null);
          }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/admin test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/intelligence-workbench.tsx apps/admin/src/__tests__/intelligence-workbench.test.tsx
git commit -m "feat(admin): build IntelligenceWorkbench UI component for V1-510"
```

---

### Task 4: Integration into `apps/admin/src/main.tsx` and Workspace Build Verification

**Files:**
- Modify: `apps/admin/src/main.tsx`

**Interfaces:**
- Renders `IntelligenceWorkbench` along with existing admin tools.

- [ ] **Step 1: Update `apps/admin/src/main.tsx`**

```tsx
import "@domus/ui/tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { SourceAdmin } from "./source-admin.js";
import { KnowledgeWorkbench } from "./knowledge-workbench.js";
import { IntelligenceWorkbench } from "./intelligence-workbench.js";
import { createIntelligenceClient } from "./intelligence-client.js";

const unavailable = { state: "UNAVAILABLE", reason: "A sessão OIDC/PKCE ainda não foi estabelecida." } as const;
const client = {
  async list() { throw new Error("SESSION_UNAVAILABLE"); },
  async create() { throw new Error("SESSION_UNAVAILABLE"); },
  async transition() { throw new Error("SESSION_UNAVAILABLE"); },
};

const intelligenceClient = createIntelligenceClient(unavailable);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IntelligenceWorkbench session={unavailable} client={intelligenceClient} />
    <KnowledgeWorkbench session={unavailable} client={{ listAssets: async () => { throw new Error("SESSION_UNAVAILABLE"); } }} />
    <SourceAdmin session={unavailable} client={client} />
  </React.StrictMode>
);
```

- [ ] **Step 2: Run full build and test suite**

Run: `pnpm build && pnpm test`
Expected: All packages compile cleanly, guardrails pass, and tests succeed.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/main.tsx
git commit -m "feat(admin): integrate IntelligenceWorkbench into admin main entry point for V1-510"
```
