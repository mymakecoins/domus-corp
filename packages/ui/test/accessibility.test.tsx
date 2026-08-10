import axe from 'axe-core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  AI_SEMANTIC_STATES,
  AiSemanticBadge,
  Button,
  CitationPill,
  EvidenceSheet,
  Select,
  SourceFreshnessBadge,
  StreamingIndicator,
  type FreshnessStatus,
} from '../src/index.js';

describe('acessibilidade da fundação e proveniência', () => {
  it.each(['light', 'dark'] as const)('não tem violações axe críticas no tema %s', async (theme) => {
    const freshnessStatuses: FreshnessStatus[] = ['vigente', 'obsoleta', 'conflitante', 'restrita'];
    const { container } = render(
      <main data-theme={theme}>
        <h1>Catálogo e Proveniência</h1>
        <Button>Continuar</Button>
        <Select aria-label="Workspace" options={[{ value: 'b', label: 'Beta' }, { value: 'a', label: 'Alfa' }]} />
        {Object.keys(AI_SEMANTIC_STATES).map((state) => (
          <AiSemanticBadge key={state} state={state as keyof typeof AI_SEMANTIC_STATES} />
        ))}
        {freshnessStatuses.map((status) => (
          <SourceFreshnessBadge key={status} status={status} />
        ))}
        <CitationPill refCode="[1]" label="Política de Segurança" status="vigente" />
        <StreamingIndicator />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it('expõe labels e status sem depender de cor', () => {
    render(
      <>
        <AiSemanticBadge state="conflitante" />
        <SourceFreshnessBadge status="obsoleta" />
        <CitationPill refCode="[2]" label="Manual Operacional" status="obsoleta" />
        <StreamingIndicator />
      </>,
    );
    expect(screen.getByText('Conflitante')).toBeVisible();
    expect(screen.getByText('Revisão necessária')).toBeVisible();
    expect(screen.getByRole('button', { name: /Manual Operacional/i })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Gerando resposta');
  });

  it('não tem violações axe no EvidenceSheet aberto', async () => {
    const { container } = render(
      <EvidenceSheet
        open={true}
        citation={{
          id: 'cit-1',
          refCode: '[1]',
          label: 'Diretriz de Segurança',
          status: 'vigente',
          primaryEvidence: {
            id: 'ev-1',
            documentTitle: 'Diretriz Corporativa',
            versionId: 'v1.0',
            sectionLocator: 'Seção 1',
            excerpt: 'Trecho acessível.',
            owner: 'Segurança',
            freshnessStatus: 'vigente',
          },
        }}
        onOpenChange={() => {}}
      />,
    );
    const result = await axe.run(container, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
