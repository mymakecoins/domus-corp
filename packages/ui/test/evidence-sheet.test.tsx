import { render, screen } from '@testing-library/react';
import React from 'react';
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

  const conflictingCitation: CitationItem = {
    id: 'cit-3',
    refCode: '[3]',
    label: 'Diretriz de Retenção',
    status: 'conflitante',
    primaryEvidence: {
      id: 'ev-3a',
      documentTitle: 'Regra de Retenção 2024',
      versionId: 'v1.0',
      sectionLocator: 'Seção 4',
      excerpt: 'Retenção padrão é de 90 dias.',
      owner: 'Legal',
      freshnessStatus: 'conflitante',
    },
    conflictingEvidences: [
      {
        id: 'ev-3b',
        documentTitle: 'Regra de Retenção 2026',
        versionId: 'v2.0',
        sectionLocator: 'Seção 2',
        excerpt: 'Retenção estendida para 180 dias.',
        owner: 'Compliance',
        freshnessStatus: 'conflitante',
      },
    ],
  };

  it('renderiza metadados e trecho para evidência válida', () => {
    render(<EvidenceSheet open={true} citation={validCitation} onOpenChange={() => {}} />);
    expect(screen.getByText('Diretrizes de Segurança v2')).toBeVisible();
    expect(screen.getByText('"Todo usuário deve usar autenticação OIDC."')).toBeVisible();
    expect(screen.getByText('Time de Segurança')).toBeVisible();
  });

  it('aplica guardrail de escopo e OMITES dados sigilosos para evidência restrita', () => {
    render(<EvidenceSheet open={true} citation={restrictedCitation} onOpenChange={() => {}} />);
    expect(screen.getByText('Operação bloqueada')).toBeVisible();
    expect(screen.queryByText('DADOS SECRETOS QUE NAO PODEM VAZAR')).toBeNull();
    expect(screen.queryByText('Relatório Secreto')).toBeNull();
  });

  it('exibe abas de comparação lado a lado para evidência conflitante', () => {
    render(<EvidenceSheet open={true} citation={conflictingCitation} onOpenChange={() => {}} />);
    expect(screen.getByText('Fonte A (Principal)')).toBeVisible();
    expect(screen.getByText('Fonte B (Divergente)')).toBeVisible();
  });
});
