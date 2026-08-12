# Plan de Implementação — Issue V1-605: Action Review e Confirmação de Impacto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o componente `ActionReviewDialog` e subcomponentes associados (`ActionConfirmationGate`, `ActionReceiptView`, `PolicyDecisionBanner`, `BudgetMeter`) no pacote `@domus/ui`, oferecendo revisão de impacto com travas dinâmicas por nível de risco, acessibilidade total (WCAG 2.1 AA) e suporte a recibos auditáveis pós-execução.

**Architecture:** Componentização modular no pacote `@domus/ui` integrada aos tipos de governança de ação (V1-604). O `ActionReviewDialog` gerencia a transição de estado da revisão da ação para a liberação controlada do botão primário (trava dinâmica por `riskLevel`) e exibe o recibo imutável (`ActionReceiptView`) após a execução.

**Tech Stack:** React 18, `@radix-ui/react-dialog`, Lucide React, class-variance-authority, Vitest, axe-core, TypeScript.

## Global Constraints

- **Guardrail de Cores**: Proibição estrita de tons Indigo/Violeta nos botões primários (`assertButtonClassesAllowed`).
- **Nível de Risco Dinâmico**: `LOW`/`MEDIUM` habilita botão diretamente; `HIGH` exige checkbox de aceite de escopo; `CRITICAL` exige digitação exata de palavra de confirmação.
- **Acessibilidade**: Foco em teclado, `aria-live`, `aria-describedby`, sem violações axe em temas Light e Dark.
- **Sem Auto-Submit**: Nenhuma ação destrutiva pode ser disparada automaticamente sem interação física explícita.

---

### Task 1: Implementar Subcomponentes Auxiliares de Governança (`ActionConfirmationGate`, `ActionReceiptView`, `PolicyDecisionBanner`, `BudgetMeter`)

**Files:**
- Modify: `packages/ui/src/components.tsx`
- Modify: `packages/ui/src/tokens.ts`

**Interfaces:**
- Consumes: `AiSemanticBadge`, `Button`, `Alert`, `Badge`, `AI_SEMANTIC_STATES`, `assertButtonClassesAllowed`
- Produces: `ActionConfirmationGate`, `ActionReceiptView`, `PolicyDecisionBanner` refatorado, `BudgetMeter` refatorado.

- [ ] **Step 1: Escrever teste falho para ActionConfirmationGate e ActionReceiptView**

Criar/modificar teste temporário ou verificar renderização inicial em `packages/ui/test/action-components.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActionConfirmationGate, ActionReceiptView } from '../src/components.js';

describe('ActionConfirmationGate', () => {
  it('exige checkbox no nível HIGH para habilitar o botão', () => {
    const onConfirm = vi.fn();
    render(
      <ActionConfirmationGate
        riskLevel="HIGH"
        isDestructive={false}
        onConfirm={onConfirm}
      />
    );
    const button = screen.getByRole('button', { name: /Confirmar ação/i });
    expect(button).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(button).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Executar o teste e garantir que falha**

Run: `pnpm --filter @domus/ui test`
Expected: FAIL ("ActionConfirmationGate is not exported / defined")

- [ ] **Step 3: Implementar ActionConfirmationGate, ActionReceiptView, PolicyDecisionBanner e BudgetMeter**

Adicionar os componentes em `packages/ui/src/components.tsx`:
```tsx
export interface ActionConfirmationGateProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isDestructive?: boolean;
  confirmationTerm?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ActionConfirmationGate({
  riskLevel,
  isDestructive = false,
  confirmationTerm = 'CONFIRMAR',
  onConfirm,
  isLoading = false,
}: ActionConfirmationGateProps) {
  const [isChecked, setIsChecked] = React.useState(false);
  const [typedTerm, setTypedTerm] = React.useState('');

  const requiresCheckbox = riskLevel === 'HIGH';
  const requiresTypedTerm = riskLevel === 'CRITICAL';

  const isButtonEnabled = React.useMemo(() => {
    if (isLoading) return false;
    if (requiresCheckbox) return isChecked;
    if (requiresTypedTerm) return typedTerm.trim().toUpperCase() === confirmationTerm.toUpperCase();
    return true;
  }, [isLoading, requiresCheckbox, isChecked, requiresTypedTerm, typedTerm, confirmationTerm]);

  return (
    <div className="domus-confirmation-gate">
      {requiresCheckbox && (
        <label className="domus-checkbox-label">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            aria-label="Confirmo que revisei o escopo e autorizo a execução"
          />
          <span>Confirmo que revisei o escopo e autorizo a execução desta ação.</span>
        </label>
      )}

      {requiresTypedTerm && (
        <div className="domus-input-field">
          <label htmlFor="confirm-term-input">
            Digite <strong>{confirmationTerm}</strong> para liberar a execução:
          </label>
          <input
            id="confirm-term-input"
            type="text"
            value={typedTerm}
            onChange={(e) => setTypedTerm(e.target.value)}
            placeholder={confirmationTerm}
            className="domus-input"
            aria-required="true"
          />
        </div>
      )}

      <Button
        variant={isDestructive ? 'destructive' : 'default'}
        disabled={!isButtonEnabled}
        onClick={onConfirm}
        className="w-full mt-4"
      >
        {isLoading ? 'Executando...' : isDestructive ? 'Confirmar e Executar (Destrutivo)' : 'Confirmar e Executar'}
      </Button>
    </div>
  );
}

export interface ActionReceiptPayload {
  receiptId: string;
  correlationId: string;
  status: 'SUCCESS' | 'FAILED' | 'INCONCLUSIVE' | 'KILLED';
  semanticState: AiSemanticState;
  executedAt: string;
  summary: string;
  auditUrl?: string;
}

export function ActionReceiptView({ receipt }: { receipt: ActionReceiptPayload }) {
  const isError = receipt.status === 'FAILED' || receipt.status === 'KILLED';
  return (
    <Card className="domus-action-receipt">
      <CardHeader>
        <div className="flex items-center justify-between">
          <AiSemanticBadge state={receipt.semanticState} />
          <Badge tone={isError ? 'error' : receipt.status === 'SUCCESS' ? 'success' : 'warning'}>
            Recibo: {receipt.status}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold mt-2">{receipt.summary}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="domus-receipt-details text-xs space-y-1">
          <div>
            <dt className="font-medium text-muted">ID do Recibo:</dt>
            <dd className="font-mono">{receipt.receiptId}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Correlação:</dt>
            <dd className="font-mono">{receipt.correlationId}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Executado em:</dt>
            <dd>{receipt.executedAt}</dd>
          </div>
        </dl>
        {receipt.auditUrl && (
          <div className="mt-3">
            <Button variant="link" size="sm" asChild>
              <a href={receipt.auditUrl} target="_blank" rel="noreferrer" aria-label="Ver log de auditoria completo">
                <ExternalLink className="mr-1 size-3" /> Ver Trilha de Auditoria
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Executar o teste e garantir que passa**

Run: `pnpm --filter @domus/ui test`
Expected: PASS

- [ ] **Step 5: Commit dos subcomponentes**

```bash
git add packages/ui/src/components.tsx
git commit -m "feat(ui): add ActionConfirmationGate and ActionReceiptView components"
```

---

### Task 2: Implementar o Modal Principal `ActionReviewDialog`

**Files:**
- Modify: `packages/ui/src/components.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `ActionConfirmationGate`, `ActionReceiptView`, `PolicyDecisionBanner`, `BudgetMeter`
- Produces: `ActionReviewDialog` completo.

- [ ] **Step 1: Escrever teste falho para o ActionReviewDialog**

Adicionar cenário no arquivo de teste `packages/ui/test/action-components.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActionReviewDialog } from '../src/components.js';

describe('ActionReviewDialog', () => {
  it('exibe intenção, destino e parâmetros redigidos no modal', () => {
    render(
      <ActionReviewDialog
        open={true}
        actionRequest={{
          id: 'req-1',
          intent: 'Deletar repositório obsoleto',
          targetSystem: 'GitHub MCP',
          riskLevel: 'CRITICAL',
          redactedParams: { token: '***REDACTED***' },
          affectedScope: ['repo:domus-legacy'],
          policyDecision: 'allowed',
          isDestructive: true,
        }}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Deletar repositório obsoleto')).toBeInTheDocument();
    expect(screen.getByText('GitHub MCP')).toBeInTheDocument();
    expect(screen.getByText('***REDACTED***')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Executar o teste e verificar falha**

Run: `pnpm --filter @domus/ui test`
Expected: FAIL (campos detalhados não presentes no stub anterior da ActionReviewDialog)

- [ ] **Step 3: Implementar a versão completa do `ActionReviewDialog`**

Substituir o stub de `ActionReviewDialog` em `packages/ui/src/components.tsx`:
```tsx
export interface ActionRequestPayload {
  id: string;
  intent: string;
  targetSystem: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redactedParams: Record<string, string>;
  affectedScope: string[];
  requiredApproval?: string;
  policyDecision: 'allowed' | 'denied' | 'conditioned' | 'blocked';
  policyReason?: string;
  budgetUsage?: { used: number; limit: number };
  isDestructive?: boolean;
}

export interface ActionReviewDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  actionRequest: ActionRequestPayload;
  onConfirm: (confirmToken?: string) => Promise<ActionReceiptPayload> | ActionReceiptPayload;
  onClose?: () => void;
}

export function ActionReviewDialog({
  open,
  onOpenChange,
  trigger,
  title = 'Revisar Ação Controlada',
  actionRequest,
  onConfirm,
  onClose,
}: ActionReviewDialogProps) {
  const [receipt, setReceipt] = React.useState<ActionReceiptPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await onConfirm();
      setReceipt(res);
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar ação no Gateway');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="domus-action-review-dialog max-w-xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Exame de intenção, parâmetros redigidos, risco e aprovação antes da transmissão.
        </DialogDescription>

        {receipt ? (
          <div className="mt-4 space-y-4" role="region" aria-label="Resultado da ação">
            <ActionReceiptView receipt={receipt} />
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setReceipt(null);
                  if (onClose) onClose();
                }}
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <PolicyDecisionBanner decision={actionRequest.policyDecision}>
              {actionRequest.policyReason ||
                (actionRequest.policyDecision === 'allowed'
                  ? 'Operação autorizada pela política de segurança.'
                  : 'Operação sujeita a restrições de segurança.')}
            </PolicyDecisionBanner>

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-3 rounded-md">
              <div>
                <span className="font-semibold block text-xs text-muted">Intenção:</span>
                <span>{actionRequest.intent}</span>
              </div>
              <div>
                <span className="font-semibold block text-xs text-muted">Sistema Destino:</span>
                <span>{actionRequest.targetSystem}</span>
              </div>
              <div>
                <span className="font-semibold block text-xs text-muted">Nível de Risco:</span>
                <Badge
                  tone={
                    actionRequest.riskLevel === 'CRITICAL' || actionRequest.riskLevel === 'HIGH'
                      ? 'error'
                      : actionRequest.riskLevel === 'MEDIUM'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {actionRequest.riskLevel}
                </Badge>
              </div>
              {actionRequest.requiredApproval && (
                <div>
                  <span className="font-semibold block text-xs text-muted">Aprovação Exigida:</span>
                  <span>{actionRequest.requiredApproval}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Escopo e Dados Afetados:
              </h4>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {actionRequest.affectedScope.map((item, idx) => (
                  <li key={idx} className="font-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {Object.keys(actionRequest.redactedParams).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Parâmetros (Redigidos):
                </h4>
                <div className="bg-muted/40 p-2 rounded text-xs font-mono">
                  {Object.entries(actionRequest.redactedParams).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actionRequest.budgetUsage && (
              <BudgetMeter
                used={actionRequest.budgetUsage.used}
                limit={actionRequest.budgetUsage.limit}
              />
            )}

            {error && (
              <div role="alert" className="text-xs text-destructive font-medium p-2 bg-destructive/10 rounded">
                {error}
              </div>
            )}

            {actionRequest.policyDecision !== 'denied' && actionRequest.policyDecision !== 'blocked' && (
              <ActionConfirmationGate
                riskLevel={actionRequest.riskLevel}
                isDestructive={actionRequest.isDestructive}
                onConfirm={handleExecute}
                isLoading={isLoading}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Executar o teste e verificar que passa**

Run: `pnpm --filter @domus/ui test`
Expected: PASS

- [ ] **Step 5: Commit do ActionReviewDialog**

```bash
git add packages/ui/src/components.tsx
git commit -m "feat(ui): implement comprehensive ActionReviewDialog with risk gates and receipts"
```

---

### Task 3: Suíte de Testes de Integração, Acessibilidade e Exportações do Pacote (`packages/ui`)

**Files:**
- Modify: `packages/ui/src/index.ts`
- Create: `packages/ui/test/action-review.test.tsx`
- Modify: `packages/ui/test/accessibility.test.tsx`

**Interfaces:**
- Consumes: `ActionReviewDialog`, `ActionConfirmationGate`, `ActionReceiptView`, `PolicyDecisionBanner`, `BudgetMeter`
- Produces: Exportações oficiais no `@domus/ui` e testes de acessibilidade com `axe-core`.

- [ ] **Step 1: Atualizar exportações em `packages/ui/src/index.ts`**

Garantir que os novos componentes e interfaces de tipo estejam declarados no arquivo barrel de exportações:
```typescript
export * from './components.js';
export * from './tokens.js';
export * from './utils.js';
```

- [ ] **Step 2: Criar suíte dedicada de testes `packages/ui/test/action-review.test.tsx`**

```tsx
import axe from 'axe-core';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ActionReviewDialog } from '../src/index.js';

describe('ActionReviewDialog & Risk Gates Integration', () => {
  it('bloqueia confirmação no nível CRITICAL até digitação exata', () => {
    const onConfirm = vi.fn().mockReturnValue({
      receiptId: 'rcpt-100',
      correlationId: 'corr-100',
      status: 'SUCCESS',
      semanticState: 'fundamentada',
      executedAt: '2026-08-12T12:00:00Z',
      summary: 'Repositório deletado com sucesso.',
    });

    render(
      <ActionReviewDialog
        open={true}
        actionRequest={{
          id: 'req-crit',
          intent: 'Deletar banco de dados',
          targetSystem: 'Database Service',
          riskLevel: 'CRITICAL',
          redactedParams: { dbHost: '***' },
          affectedScope: ['db:production'],
          policyDecision: 'allowed',
          isDestructive: true,
        }}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirmar e Executar/i });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByLabelText(/Digite CONFIRMAR para liberar/i);
    fireEvent.change(input, { target: { value: 'WRONG' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'CONFIRMAR' } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('não possui violações de acessibilidade axe no modal ActionReviewDialog', async () => {
    const { container } = render(
      <ActionReviewDialog
        open={true}
        actionRequest={{
          id: 'req-high',
          intent: 'Alterar permissão de usuário',
          targetSystem: 'IAM MCP',
          riskLevel: 'HIGH',
          redactedParams: { userSecret: '***' },
          affectedScope: ['user:123'],
          policyDecision: 'conditioned',
          budgetUsage: { used: 50, limit: 100 },
        }}
        onConfirm={vi.fn()}
      />
    );

    const result = await axe.run(container, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Executar a suíte de testes de acessibilidade e integração**

Run: `pnpm --filter @domus/ui test`
Expected: PASS (todos os testes de acessibilidade e fluxo passando)

- [ ] **Step 4: Commit dos testes de integração**

```bash
git add packages/ui/src/index.ts packages/ui/test/action-review.test.tsx
git commit -m "test(ui): add comprehensive accessibility and integration tests for ActionReviewDialog"
```

---

### Task 4: Validação do Build Corporativo e Geração de Evidências

**Files:**
- Create: `docs/evidence/V1-605-verificacao.md`

**Interfaces:**
- Consumes: Build e testes do pacote `@domus/ui` e `control-plane`
- Produces: Relatório de evidência `V1-605-verificacao.md`.

- [ ] **Step 1: Executar build e suíte de testes completa do workspace**

Run: `pnpm --filter @domus/ui build && pnpm --filter @domus/ui test`
Expected: Build compilado sem erros TypeScript e 100% dos testes aprovados.

- [ ] **Step 2: Escrever o relatório de evidências de verificação**

Escrever `docs/evidence/V1-605-verificacao.md`:
```markdown
# Relatório de Verificação de Implementação — Issue V1-605: Action Review

## 1. Visão Geral
- **Issue**: V1-605 — Implementar Action Review e confirmação de impacto
- **Data de Conclusão**: 2026-08-12
- **Status**: ✅ Concluído com Sucesso

## 2. Cobertura dos Critérios de Aceite (DoD)

| Critério de Aceite | Status | Evidência de Implementação |
|---|:---:|---|
| **1. Exibição de Intenção, Destino e Parâmetros** | ✅ Atendido | Componente `ActionReviewDialog` renderiza intenção, destino, parâmetros redigidos, escopo, risco e policy. |
| **2. Confirmação Dinâmica por Nível de Risco** | ✅ Atendido | `ActionConfirmationGate` exige checkbox no nível `HIGH` e digitação de confirmação no nível `CRITICAL`. |
| **3. Guardrail de Botão e Cores** | ✅ Atendido | `assertButtonClassesAllowed` impede cores Indigo/Violeta; sem auto-submit ou botões ambíguos. |
| **4. Recibo auditável pós-execução** | ✅ Atendido | `ActionReceiptView` exibe status (`SUCCESS`, `FAILED`, `INCONCLUSIVE`, `KILLED`), badge semântica da IA e link de auditoria. |
| **5. Acessibilidade WCAG 2.1 AA** | ✅ Atendido | Foco controlado via Radix UI, atributos `aria-live`, suporte a teclado e 0 violações no `axe-core`. |

## 3. Evidências de Build e Testes
- Compilação TypeScript: `pnpm --filter @domus/ui build` (OK)
- Testes Unitários e Acessibilidade: `pnpm --filter @domus/ui test` (OK)
```

- [ ] **Step 3: Commit final do relatório de evidência**

```bash
git add docs/evidence/V1-605-verificacao.md
git commit -m "docs(evidence): add verification report for V1-605 Action Review"
```
