import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExecutiveBriefingCard, SeparationBadge } from '../index.js';

describe('Intelligence Domain Components', () => {
  it('renders SeparationBadge correctly for fact, inference, recommendation', () => {
    render(<SeparationBadge type="fact" />);
    expect(screen.getByText('Dado Observado (Fato)')).toBeDefined();

    render(<SeparationBadge type="inference" />);
    expect(screen.getByText('Interpretação (Inferência)')).toBeDefined();

    render(<SeparationBadge type="recommendation" />);
    expect(screen.getByText('Ação Sugerida (Recomendação)')).toBeDefined();
  });

  it('renders ExecutiveBriefingCard with summary and citations count', () => {
    render(
      <ExecutiveBriefingCard
        title="Briefing Semanal de Operações"
        role="Gestor Operacional"
        timeWindow="7d"
        summary="Resumo de mudanças regulatórias e 2 lacunas identificadas."
        changesCount={3}
        gapsCount={2}
        insightsCount={1}
      />
    );
    expect(screen.getByText('Briefing Semanal de Operações')).toBeDefined();
    expect(screen.getByText('3 mudanças')).toBeDefined();
    expect(screen.getByText('2 gaps')).toBeDefined();
    expect(screen.getByText('1 insights')).toBeDefined();
  });
});
