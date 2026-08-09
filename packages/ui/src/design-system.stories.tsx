import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, Skeleton, AiSemanticBadge, AI_SEMANTIC_STATES, EmptyStateWithNextAction, StreamingIndicator } from './index.js';

const meta = { title: 'Domus/Design System', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Foundation: Story = {
  render: () => <main aria-labelledby="catalog-title"><h1 id="catalog-title">Design System Domus</h1><Card><CardHeader><CardTitle>Estados semânticos da IA</CardTitle></CardHeader><CardContent><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.keys(AI_SEMANTIC_STATES).map((state) => <AiSemanticBadge key={state} state={state as keyof typeof AI_SEMANTIC_STATES} />)}</div></CardContent></Card><section aria-labelledby="buttons-title"><h2 id="buttons-title">Ações</h2>{(['default','secondary','outline','ghost','destructive','link'] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}</section><Select aria-label="Workspace" options={[{ value: 'financeiro', label: 'Financeiro' }, { value: 'administrativo', label: 'Administrativo' }]} /><StreamingIndicator /><Skeleton style={{ width: 240 }} /><EmptyStateWithNextAction title="Sem evidência" description="Refine a busca ou abra um gap." action={<Button variant="outline">Refinar busca</Button>} /></main>,
};
