import { describe, expect, it } from 'vitest';
import { createIntelligenceClient } from '../intelligence-client.js';

describe('IntelligenceClient', () => {
  it('returns fallback mock insights when session is UNAVAILABLE', async () => {
    const client = createIntelligenceClient({ state: 'UNAVAILABLE', reason: 'Sessão indisponível' });
    const insights = await client.listInsights();
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]?.tripartite.fact).toBeDefined();
  });

  it('returns briefings list', async () => {
    const client = createIntelligenceClient({ state: 'UNAVAILABLE', reason: 'Sessão indisponível' });
    const briefings = await client.listBriefings();
    expect(briefings.length).toBeGreaterThan(0);
  });

  it('generates executive briefing on demand', async () => {
    const client = createIntelligenceClient({ state: 'UNAVAILABLE', reason: 'Sessão indisponível' });
    const briefing = await client.generateBriefing('Diretoria Executiva');
    expect(briefing.role).toBe('Diretoria Executiva');
    expect(briefing.title).toContain('Briefing sob demanda');
  });
});
