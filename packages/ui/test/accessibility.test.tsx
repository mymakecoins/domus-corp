import axe from 'axe-core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  AI_SEMANTIC_STATES,
  ActionConfirmationGate,
  ActionReceiptView,
  ActionReviewDialog,
  AiSemanticBadge,
  Button,
  CitationPill,
  EvidenceSheet,
  Select,
  SourceFreshnessBadge,
  StreamingIndicator,
  type ActionReceiptPayload,
  type ActionRequestPayload,
  type FreshnessStatus,
} from '../src/index.js';

describe('acessibilidade da fundação e proveniência', () => {
  const sampleReceipt: ActionReceiptPayload = {
    receiptId: 'rcpt-a11y-1',
    correlationId: 'corr-a11y-1',
    status: 'SUCCESS',
    semanticState: 'fundamentada',
    executedAt: '2026-08-12T12:00:00Z',
    summary: 'Operação de acessibilidade testada com sucesso.',
  };

  const sampleRequest: ActionRequestPayload = {
    id: 'req-a11y-1',
    intent: 'Atualizar regras de segurança do firewall',
    targetSystem: 'firewall-core',
    riskLevel: 'HIGH',
    redactedParams: { ruleId: 'RULE-101' },
    affectedScope: ['infra', 'firewall'],
    policyDecision: 'allowed',
    policyReason: 'Ação aprovada por policy.',
  };

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
        <ActionConfirmationGate riskLevel="HIGH" onConfirm={() => {}} />
        <ActionReceiptView receipt={sampleReceipt} />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });

  it.each(['light', 'dark'] as const)('não tem violações axe no ActionReviewDialog aberto no tema %s', async (theme) => {
    render(
      <div data-theme={theme}>
        <ActionReviewDialog
          open={true}
          actionRequest={sampleRequest}
          onConfirm={() => sampleReceipt}
        />
      </div>,
    );
    const result = await axe.run(document.body, {
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

