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

  it('supports citation items with primary and conflicting evidences', () => {
    const item: CitationItem = {
      id: 'cit-101',
      refCode: '[1]',
      label: 'Diretriz Corporativa',
      status: 'conflitante',
      primaryEvidence: {
        id: 'ev-1',
        documentTitle: 'Diretriz A',
        versionId: '1.0',
        sectionLocator: 'Página 2',
        freshnessStatus: 'conflitante',
      },
      conflictingEvidences: [
        {
          id: 'ev-2',
          documentTitle: 'Diretriz B',
          versionId: '2.0',
          sectionLocator: 'Página 4',
          freshnessStatus: 'conflitante',
        },
      ],
    };
    expect(item.status).toBe('conflitante');
    expect(item.conflictingEvidences?.length).toBe(1);
  });
});
