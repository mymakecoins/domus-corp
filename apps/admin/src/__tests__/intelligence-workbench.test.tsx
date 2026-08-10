import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntelligenceWorkbench } from '../intelligence-workbench.js';
import { createIntelligenceClient } from '../intelligence-client.js';

describe('IntelligenceWorkbench', () => {
  it('renders Intelligence Workbench header and main tabs', async () => {
    const session = { state: 'AUTHENTICATED' as const, workspaceName: 'Operações Corporativas' };
    const client = createIntelligenceClient(session);

    render(<IntelligenceWorkbench session={session} client={client} />);

    expect(screen.getByText('Intelligence Workbench')).toBeDefined();
    expect(screen.getByText(/Insights Operacionais/)).toBeDefined();
    expect(screen.getByText(/Briefings Executivos/)).toBeDefined();
  });

  it('renders fallback warning when session is UNAVAILABLE', () => {
    const session = { state: 'UNAVAILABLE' as const, reason: 'Sessão OIDC não iniciada.' };
    const client = createIntelligenceClient(session);

    render(<IntelligenceWorkbench session={session} client={client} />);

    expect(screen.getByText('Intelligence Workbench indisponível')).toBeDefined();
  });
});
