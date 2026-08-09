import axe from 'axe-core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AI_SEMANTIC_STATES, AiSemanticBadge, Button, Select, StreamingIndicator } from '../src/index.js';

describe('acessibilidade da fundação', () => {
  it.each(['light', 'dark'] as const)('não tem violações axe críticas no tema %s', async (theme) => {
    const { container } = render(<main data-theme={theme}><h1>Catálogo</h1><Button>Continuar</Button><Select aria-label="Workspace" options={[{ value: 'b', label: 'Beta' }, { value: 'a', label: 'Alfa' }]} />{Object.keys(AI_SEMANTIC_STATES).map((state) => <AiSemanticBadge key={state} state={state as keyof typeof AI_SEMANTIC_STATES} />)}<StreamingIndicator /></main>);
    const result = await axe.run(container, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it('expõe labels e status sem depender de cor', () => {
    render(<><AiSemanticBadge state="conflitante" /><StreamingIndicator /></>);
    expect(screen.getByText('Conflitante')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Gerando resposta');
  });
});
