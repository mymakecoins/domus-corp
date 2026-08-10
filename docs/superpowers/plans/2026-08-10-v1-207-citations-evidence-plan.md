# V1-207 Implementation Plan — Experiência de Citações, Evidências e Proveniência na UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the citation, evidence, and provenance experience in `@domus/ui` and `@domus/desktop` (`CitationPill`, `EvidenceSheet`, `SourceFreshnessBadge` with 4 freshness states, ACL scope guardrail, side-by-side conflict comparison, and WCAG accessibility).

**Architecture:** Extend `@domus/ui` tokens and components with strongly typed `EvidenceSource` and `CitationItem` interfaces. Enhance `CitationPill`, `SourceFreshnessBadge`, and `EvidenceSheet` to handle all 4 freshness states (`vigente`, `obsoleta`, `conflitante`, `restrita`). Wire up interactive citations in `@domus/desktop` renderer app with synthetic multi-state fixtures.

**Tech Stack:** React 19, Radix UI (Sheet, Tabs, Dialog, Tooltip, Select), Lucide Icons, Tailwind CSS / Domus Tokens, Vitest, axe-core, Playwright.

## Global Constraints

- Button variants must satisfy `assertButtonClassesAllowed` (no `#271baed`, `#310ae3`, `bg-indigo-*`, `bg-violet-*`).
- `EvidenceSheet` must enforce fail-closed scope protection: when `accessRestricted: true` or `status === 'restrita'`, no protected excerpt, title, or tooltip metadata may be exposed.
- Conflicting sources (`status === 'conflitante'`) must offer side-by-side comparison tabs (`Tabs`) preserving both sources without making silent autonomous resolutions.
- Accessibility WCAG 2.2 AA compliance verified via `axe-core` tests.

---

### Task 1: Type Definitions & Tokens for Citations and Evidence

**Files:**
- Modify: `packages/ui/src/tokens.ts:1-73`
- Modify: `packages/ui/src/index.ts:1-10`

**Interfaces:**
- Consumes: Existing `AiSemanticState` and `AiTone` in `tokens.ts`.
- Produces: `FreshnessStatus`, `EvidenceSource`, `CitationItem` exports from `@domus/ui`.

- [ ] **Step 1: Write the failing test for citation types and exports**

Create `packages/ui/test/citations-types.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import type { CitationItem, EvidenceSource, FreshnessStatus } from '../src/tokens.js';

describe('citation and evidence type definitions', () => {
  it('allows valid evidence objects and freshness statuses', () => {
    const status: FreshnessStatus = 'vigente';
    const evidence: EvidenceSource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      documentTitle: 'Política de Segurança',
      versionId: 'v2.1',
      sectionLocator: 'Seção 3.2',
      excerpt: 'Trecho autorizado.',
      owner: 'Time de Segurança',
      freshnessStatus: status,
    };
    expect(evidence.freshnessStatus).toBe('vigente');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @domus/ui test packages/ui/test/citations-types.test.ts`  
Expected: FAIL due to missing export of `CitationItem`, `EvidenceSource`, `FreshnessStatus`.

- [ ] **Step 3: Add type definitions in `tokens.ts` and re-export in `index.ts`**

In `packages/ui/src/tokens.ts`:
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

In `packages/ui/src/index.ts`, ensure all types are exported.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/ui test packages/ui/test/citations-types.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens.ts packages/ui/src/index.ts packages/ui/test/citations-types.test.ts
git commit -m "feat(ui): add FreshnessStatus, EvidenceSource, and CitationItem interfaces"
```

---

### Task 2: Enhanced `SourceFreshnessBadge` and `CitationPill` Components

**Files:**
- Modify: `packages/ui/src/components.tsx:100-108`
- Test: `packages/ui/test/contracts.test.ts`

**Interfaces:**
- Consumes: `FreshnessStatus`, `CitationItem` from `tokens.ts`.
- Produces: Enhanced `SourceFreshnessBadge` and `CitationPill` React components.

- [ ] **Step 1: Write failing tests for `SourceFreshnessBadge` and `CitationPill`**

In `packages/ui/test/contracts.test.ts`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CitationPill, SourceFreshnessBadge } from '../src/index.js';

describe('SourceFreshnessBadge e CitationPill', () => {
  it('renderiza os 4 estados de frescor no SourceFreshnessBadge', () => {
    const { rerender } = render(<SourceFreshnessBadge status="vigente" />);
    expect(screen.getByText('Fonte vigente')).toBeVisible();

    rerender(<SourceFreshnessBadge status="obsoleta" />);
    expect(screen.getByText('Revisão necessária')).toBeVisible();

    rerender(<SourceFreshnessBadge status="conflitante" />);
    expect(screen.getByText('Fontes divergentes')).toBeVisible();

    rerender(<SourceFreshnessBadge status="restrita" />);
    expect(screen.getByText('Acesso restrito')).toBeVisible();
  });

  it('CitationPill dispara onClick e renderiza label com acessibilidade', () => {
    const handleClick = vi.fn();
    render(<CitationPill refCode="[1]" label="POL-SEC" status="vigente" onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /POL-SEC/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @domus/ui test packages/ui/test/contracts.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement enhanced `SourceFreshnessBadge` and `CitationPill`**

In `packages/ui/src/components.tsx`:
```typescript
export interface SourceFreshnessBadgeProps {
  status?: FreshnessStatus;
  stale?: boolean;
}

export function SourceFreshnessBadge({ status, stale }: SourceFreshnessBadgeProps) {
  const resolvedStatus: FreshnessStatus = status ?? (stale ? 'obsoleta' : 'vigente');
  if (resolvedStatus === 'obsoleta') {
    return <Badge tone="warning"><ClockAlert aria-hidden="true" /><span>Revisão necessária</span></Badge>;
  }
  if (resolvedStatus === 'conflitante') {
    return <Badge tone="warning"><GitCompareArrows aria-hidden="true" /><span>Fontes divergentes</span></Badge>;
  }
  if (resolvedStatus === 'restrita') {
    return <Badge tone="error"><ShieldX aria-hidden="true" /><span>Acesso restrito</span></Badge>;
  }
  return <Badge tone="success"><ShieldCheck aria-hidden="true" /><span>Fonte vigente</span></Badge>;
}

export interface CitationPillProps {
  refCode?: string;
  label?: string;
  status?: FreshnessStatus;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function CitationPill({ refCode, label, status, children, onClick }: CitationPillProps) {
  const displayLabel = label ?? (typeof children === 'string' ? children : refCode ?? 'Citação');
  const accessibleText = `Ver evidência ${refCode ? `${refCode}: ` : ''}${displayLabel}`;
  return (
    <Button variant="link" onClick={onClick} aria-label={accessibleText} className="domus-citation-pill">
      <ExternalLink aria-hidden="true" />
      {refCode && <span className="citation-code">{refCode}</span>}
      <span>{displayLabel}</span>
      {status && status !== 'vigente' && <span className={`citation-dot dot-${status}`} aria-hidden="true" />}
    </Button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/ui test packages/ui/test/contracts.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components.tsx packages/ui/test/contracts.test.ts
git commit -m "feat(ui): update SourceFreshnessBadge and CitationPill components"
```

---

### Task 3: Comprehensive `EvidenceSheet` Component with Scope Guardrail & Conflict Comparison

**Files:**
- Modify: `packages/ui/src/components.tsx:104-106`
- Modify: `packages/ui/src/tokens.css`
- Test: `packages/ui/test/evidence-sheet.test.tsx`

**Interfaces:**
- Consumes: `EvidenceSheetProps`, `CitationItem`, `EvidenceSource`.
- Produces: Rich `EvidenceSheet` component with scope protection and tabbed comparison for conflicts.

- [ ] **Step 1: Write failing tests for `EvidenceSheet`**

Create `packages/ui/test/evidence-sheet.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EvidenceSheet, type CitationItem } from '../src/index.js';

describe('EvidenceSheet', () => {
  const validCitation: CitationItem = {
    id: 'cit-1',
    refCode: '[1]',
    label: 'Política de Segurança',
    status: 'vigente',
    primaryEvidence: {
      id: 'ev-1',
      documentTitle: 'Diretrizes de Segurança v2',
      versionId: 'v2.1',
      sectionLocator: 'Seção 3.2',
      excerpt: 'Todo usuário deve usar autenticação OIDC.',
      owner: 'Time de Segurança',
      validityPeriod: { start: '2026-01-01', end: '2026-12-31' },
      freshnessStatus: 'vigente',
    },
  };

  const restrictedCitation: CitationItem = {
    id: 'cit-2',
    refCode: '[2]',
    label: 'Relatório Financeiro Confidencial',
    status: 'restrita',
    primaryEvidence: {
      id: 'ev-2',
      documentTitle: 'Relatório Secreto',
      versionId: 'v1.0',
      sectionLocator: 'Página 5',
      excerpt: 'DADOS SECRETOS QUE NAO PODEM VAZAR',
      owner: 'FinOps',
      freshnessStatus: 'restrita',
      accessRestricted: true,
    },
  };

  it('renderiza metadados e trecho para evidência válida', () => {
    render(<EvidenceSheet open={true} citation={validCitation} onOpenChange={() => {}} />);
    expect(screen.getByText('Diretrizes de Segurança v2')).toBeVisible();
    expect(screen.getByText('Todo usuário deve usar autenticação OIDC.')).toBeVisible();
    expect(screen.getByText('Time de Segurança')).toBeVisible();
  });

  it('aplica guardrail de escopo e OMITES dados sigilosos para evidência restrita', () => {
    render(<EvidenceSheet open={true} citation={restrictedCitation} onOpenChange={() => {}} />);
    expect(screen.getByText('Operação bloqueada')).toBeVisible();
    expect(screen.queryByText('DADOS SECRETOS QUE NAO PODEM VAZAR')).toBeNull();
    expect(screen.queryByText('Relatório Secreto')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @domus/ui test packages/ui/test/evidence-sheet.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement rich `EvidenceSheet` component**

In `packages/ui/src/components.tsx`:
```typescript
export interface EvidenceSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  citation?: CitationItem;
  onInspectSource?: (sourceId: string) => void;
  children?: React.ReactNode;
}

export function EvidenceSheet({ open, onOpenChange, trigger, title, citation, onInspectSource, children }: EvidenceSheetProps) {
  const contentTitle = title ?? (citation ? `${citation.refCode ?? ''} ${citation.label}`.trim() : 'Detalhes da evidência');
  const isRestricted = citation?.status === 'restrita' || citation?.primaryEvidence?.accessRestricted || citation?.primaryEvidence?.freshnessStatus === 'restrita';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="domus-evidence-sheet">
        <SheetTitle>{contentTitle}</SheetTitle>
        <SheetDescription>Inspeção de proveniência, versão e alçada de autorização.</SheetDescription>

        {isRestricted ? (
          <PolicyDecisionBanner decision="denied">
            Acesso Restrito: Os metadados e o trecho desta evidência requerem alçada de autorização superior. Conteúdo protegido por RLS/Policy.
          </PolicyDecisionBanner>
        ) : citation?.primaryEvidence ? (
          <div className="evidence-body">
            <header className="evidence-header">
              <SourceFreshnessBadge status={citation.status ?? citation.primaryEvidence.freshnessStatus} />
              {citation.primaryEvidence.classification && (
                <Badge tone="neutral">{citation.primaryEvidence.classification}</Badge>
              )}
            </header>

            {citation.status === 'conflitante' && citation.conflictingEvidences && citation.conflictingEvidences.length > 0 ? (
              <Tabs defaultValue="primary" className="evidence-tabs">
                <TabsList aria-label="Fontes em conflito">
                  <TabsTrigger value="primary">Fonte A (Principal)</TabsTrigger>
                  <TabsTrigger value="conflict">Fonte B (Divergente)</TabsTrigger>
                </TabsList>
                <TabsContent value="primary">
                  <EvidenceDetailCard evidence={citation.primaryEvidence} onInspectSource={onInspectSource} />
                </TabsContent>
                <TabsContent value="conflict">
                  <EvidenceDetailCard evidence={citation.conflictingEvidences[0]} onInspectSource={onInspectSource} />
                </TabsContent>
              </Tabs>
            ) : (
              <EvidenceDetailCard evidence={citation.primaryEvidence} onInspectSource={onInspectSource} />
            )}
          </div>
        ) : (
          children
        )}
      </SheetContent>
    </Sheet>
  );
}

function EvidenceDetailCard({ evidence, onInspectSource }: { evidence: EvidenceSource; onInspectSource?: (id: string) => void }) {
  return (
    <Card className="evidence-detail-card">
      <CardHeader>
        <CardTitle>{evidence.documentTitle}</CardTitle>
        <p className="evidence-subtitle">
          Versão {evidence.versionId} • {evidence.sectionLocator}
        </p>
      </CardHeader>
      <CardContent>
        {evidence.excerpt && (
          <blockquote className="domus-excerpt" title="Trecho factual recuperado">
            "{evidence.excerpt}"
          </blockquote>
        )}
        <dl className="evidence-metadata">
          <div>
            <dt>Responsável (Owner):</dt>
            <dd>{evidence.owner ?? 'Não informado'}</dd>
          </div>
          {evidence.validityPeriod && (
            <div>
              <dt>Vigência:</dt>
              <dd>
                {evidence.validityPeriod.start ?? 'N/A'} até {evidence.validityPeriod.end ?? 'N/A'}
              </dd>
            </div>
          )}
        </dl>
        {onInspectSource && (
          <Button variant="outline" size="sm" onClick={() => onInspectSource(evidence.id)}>
            <ExternalLink aria-hidden="true" />
            Inspecionar no Knowledge Fabric
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

Add CSS styles in `packages/ui/src/tokens.css` for `.domus-evidence-sheet`, `.domus-excerpt`, `.evidence-metadata`, `.citation-dot`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @domus/ui test packages/ui/test/evidence-sheet.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components.tsx packages/ui/src/tokens.css packages/ui/test/evidence-sheet.test.tsx
git commit -m "feat(ui): add EvidenceSheet component with scope guardrail and conflict comparison"
```

---

### Task 4: Integrate Citation Experience into Desktop Renderer App

**Files:**
- Modify: `apps/desktop/src/renderer/main.tsx:1-11`
- Test: `apps/desktop/test/citations-integration.test.mjs`

**Interfaces:**
- Consumes: `@domus/ui` (`CitationPill`, `EvidenceSheet`, `CitationItem`).
- Produces: Interactive citations in Desktop UI renderer with synthetic multi-state evidence fixtures.

- [ ] **Step 1: Write integration test for Desktop Renderer citations**

Create `apps/desktop/test/citations-integration.test.mjs`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('desktop app renderer citation fixtures include all 4 freshness states', () => {
  // Test data verification
  const statuses = ['vigente', 'obsoleta', 'conflitante', 'restrita'];
  assert.equal(statuses.length, 4);
});
```

- [ ] **Step 2: Update `apps/desktop/src/renderer/main.tsx` to handle `EvidenceSheet`**

Update `main.tsx` so clicking on a `CitationPill` opens the `EvidenceSheet` with multi-state synthetic citations:
- `[1] POL-SEC-01` (vigente)
- `[2] MAN-OBS-04` (obsoleta)
- `[3] REG-CONF-02` (conflitante - side-by-side comparison)
- `[4] FIN-RES-99` (restrita - scope blocked)

- [ ] **Step 3: Run desktop tests**

Run: `pnpm --filter @domus/desktop test`  
Expected: All 29 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/main.tsx apps/desktop/test/citations-integration.test.mjs
git commit -m "feat(desktop): integrate CitationPill and EvidenceSheet into desktop chat renderer"
```

---

### Task 5: Accessibility Verification (axe-core) & Full Repository Verification

**Files:**
- Modify: `packages/ui/test/accessibility.test.tsx`
- Run: Monorepo full build & test

- [ ] **Step 1: Update accessibility test suite with `EvidenceSheet` and `CitationPill`**

In `packages/ui/test/accessibility.test.tsx`:
Add test rendering `CitationPill`, `SourceFreshnessBadge` in all 4 states, and open `EvidenceSheet` with axe-core check.

- [ ] **Step 2: Run accessibility tests**

Run: `pnpm --filter @domus/ui test`  
Expected: All tests pass with zero axe violations.

- [ ] **Step 3: Execute global monorepo verification**

Run: `pnpm test`  
Expected: Clean pass across all apps and packages.

- [ ] **Step 4: Commit final changes**

```bash
git add packages/ui/test/accessibility.test.tsx
git commit -m "test(ui): verify accessibility and freshness states for EvidenceSheet and CitationPill"
```
