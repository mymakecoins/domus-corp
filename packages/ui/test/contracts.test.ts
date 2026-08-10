import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  AI_SEMANTIC_STATES,
  assertButtonClassesAllowed,
  normalizeSelectOptions,
} from '../src/index.js';

describe('contratos aprovados do Design System', () => {
  it('expõe exatamente os oito estados semânticos com comunicação não cromática', () => {
    expect(Object.keys(AI_SEMANTIC_STATES)).toEqual([
      'fundamentada',
      'parcial',
      'conflitante',
      'inferida',
      'sem-evidencia',
      'obsoleta',
      'bloqueada',
      'inconclusiva',
    ]);
    for (const state of Object.values(AI_SEMANTIC_STATES)) {
      expect(state).toMatchObject({
        label: expect.any(String),
        description: expect.any(String),
        icon: expect.anything(),
        tone: expect.any(String),
        nextAction: expect.objectContaining({ label: expect.any(String) }),
      });
    }
  });

  it.each(['#271BAE', '#310AE3', 'bg-indigo-700', 'hover:bg-violet-500', 'brand-depth', 'brand-secondary'])(
    'rejeita %s em variantes de Button',
    (forbidden) => expect(() => assertButtonClassesAllowed(forbidden)).toThrow(),
  );

  it('aceita as classes semânticas aprovadas de Button', () => {
    expect(() => assertButtonClassesAllowed('bg-primary hover:bg-primary-hover')).not.toThrow();
  });

  it('rejeita valores vazios e ordena opções em pt-BR', () => {
    expect(() => normalizeSelectOptions([{ value: '', label: 'Placeholder' }])).toThrow();
    expect(
      normalizeSelectOptions([
        { value: 'z', label: 'Zebra' },
        { value: 'a', label: 'Árvore' },
        { value: 'b', label: 'Bola' },
      ]).map(({ label }) => label),
    ).toEqual(['Árvore', 'Bola', 'Zebra']);
  });

  it('não contém cores hexadecimais nos componentes', () => {
    const components = readFileSync(
      resolve(process.cwd(), 'src/components.tsx'),
      'utf8',
    );
    expect(components).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('suporta os 4 estados visuais de proveniência no SourceFreshnessBadge e CitationPill', () => {
    const freshnessStatuses = ['vigente', 'obsoleta', 'conflitante', 'restrita'] as const;
    expect(freshnessStatuses.length).toBe(4);
  });
});
