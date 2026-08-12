import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, Skeleton, AiSemanticBadge, AI_SEMANTIC_STATES, EmptyStateWithNextAction, StreamingIndicator, ActionReviewDialog, SeparationBadge } from './index.js';

const meta = { title: 'Domus/Design System', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Foundation: Story = {
  render: () => <main aria-labelledby="catalog-title"><h1 id="catalog-title">Design System Domus</h1><Card><CardHeader><CardTitle>Estados semânticos da IA</CardTitle></CardHeader><CardContent><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.keys(AI_SEMANTIC_STATES).map((state) => <AiSemanticBadge key={state} state={state as keyof typeof AI_SEMANTIC_STATES} />)}</div></CardContent></Card><section aria-labelledby="buttons-title"><h2 id="buttons-title">Ações</h2>{(['default','secondary','outline','ghost','destructive','link'] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}</section><Select aria-label="Workspace" options={[{ value: 'financeiro', label: 'Financeiro' }, { value: 'administrativo', label: 'Administrativo' }]} /><StreamingIndicator /><Skeleton style={{ width: 240 }} /><EmptyStateWithNextAction title="Sem evidência" description="Refine a busca ou abra um gap." action={<Button variant="outline">Refinar busca</Button>} /></main>,
};

export const ActionReviewAndRisk: Story = {
  render: () => (
    <main aria-labelledby="risk-title">
      <h1 id="risk-title">Revisão de Ação e Compreensão de Risco</h1>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <SeparationBadge type="fact" />
        <SeparationBadge type="inference" />
        <SeparationBadge type="recommendation" />
      </div>
      <ActionReviewDialog
        open={true}
        actionRequest={{
          id: 'req-browser-1',
          intent: 'Atualizar configuração de produção',
          targetSystem: 'prod-gateway',
          riskLevel: 'HIGH',
          redactedParams: { key: 'VAL-123' },
          affectedScope: ['gateway-cluster'],
          requiredApproval: 'Tech Lead / SRE',
          policyDecision: 'conditioned',
          policyReason: 'Requer aceite de responsabilidade antes da execução.',
          isDestructive: true,
        }}
        onConfirm={() => ({
          receiptId: 'rcpt-b-1',
          correlationId: 'corr-b-1',
          status: 'SUCCESS',
          semanticState: 'fundamentada',
          executedAt: '2026-08-12T20:00:00Z',
          summary: 'Ação executada no browser com sucesso.',
        })}
      />
    </main>
  ),
};

