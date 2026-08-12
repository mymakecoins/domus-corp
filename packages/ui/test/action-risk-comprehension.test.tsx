import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  AI_SEMANTIC_STATES,
  ActionConfirmationGate,
  ActionReceiptView,
  ActionReviewDialog,
  AiSemanticBadge,
  BudgetMeter,
  PolicyDecisionBanner,
  SeparationBadge,
  SourceFreshnessBadge,
  type ActionReceiptPayload,
  type ActionRequestPayload,
} from '../src/index.js';

describe('Suíte de Compreensão de Risco de Ações e Separação Semântica', () => {
  const mockLowRiskRequest: ActionRequestPayload = {
    id: 'req-low-1',
    intent: 'Consultar métricas de leitura do sistema',
    targetSystem: 'metrics-api',
    riskLevel: 'LOW',
    redactedParams: {},
    affectedScope: ['read-only-metrics'],
    policyDecision: 'allowed',
    policyReason: 'Ação de baixa criticidade permitida automaticamente.',
  };

  const mockHighRiskRequest: ActionRequestPayload = {
    id: 'req-high-2',
    intent: 'Reiniciar cluster de cache em produção',
    targetSystem: 'redis-prod-cluster',
    riskLevel: 'HIGH',
    redactedParams: { nodeCount: '8' },
    affectedScope: ['cache-layer', 'session-store'],
    requiredApproval: 'Gerente de Operações (SRE)',
    policyDecision: 'conditioned',
    policyReason: 'Exige confirmação explícita do operador devido ao impacto em sessões ativas.',
    isDestructive: true,
  };

  const mockCriticalRiskRequest: ActionRequestPayload = {
    id: 'req-crit-99',
    intent: 'Expurgar partição de histórico financeiro',
    targetSystem: 'pg-ledger-db',
    riskLevel: 'CRITICAL',
    redactedParams: { partitionDate: '2025-Q1', recordCount: '150000' },
    affectedScope: ['financial-ledger', 'audit-history'],
    requiredApproval: 'Diretoria de Segurança & Compliance',
    policyDecision: 'conditioned',
    policyReason: 'Ação irreversível de expurgo exige confirmação por token digitado.',
    isDestructive: true,
  };

  const mockBlockedRequest: ActionRequestPayload = {
    id: 'req-blocked-1',
    intent: 'Alterar permissões de acesso ao cofre de chaves de produção',
    targetSystem: 'vault-kms-prod',
    riskLevel: 'CRITICAL',
    redactedParams: { keyId: 'KMS-MASTER-KEY' },
    affectedScope: ['kms-secrets'],
    policyDecision: 'denied',
    policyReason: 'Usuário não possui credencial de nível CISO necessária para alterar chaves mestras.',
    isDestructive: true,
  };

  const sampleReceiptSuccess: ActionReceiptPayload = {
    receiptId: 'rcpt-risk-100',
    correlationId: 'corr-risk-100',
    status: 'SUCCESS',
    semanticState: 'fundamentada',
    executedAt: '2026-08-12T15:30:00Z',
    summary: 'Ação executada com sucesso e auditada.',
    auditUrl: 'https://audit.domus.corp/rcpt-risk-100',
  };

  describe('Compreensão visual e semântica de risco (Fato vs. Inferência vs. Recomendação)', () => {
    it('distingue Fato, Inferência e Recomendação com rótulo descritivo e sem depender apenas de cor', () => {
      render(
        <div>
          <SeparationBadge type="fact" />
          <SeparationBadge type="inference" />
          <SeparationBadge type="recommendation" />
        </div>
      );

      expect(screen.getByText('Dado Observado (Fato)')).toBeVisible();
      expect(screen.getByText('Interpretação (Inferência)')).toBeVisible();
      expect(screen.getByText('Ação Sugerida (Recomendação)')).toBeVisible();
    });

    it('apresenta todos os 8 estados semânticos de IA com rótulos e descrições acessíveis para leitor de tela', () => {
      render(
        <div>
          {Object.keys(AI_SEMANTIC_STATES).map((stateKey) => (
            <AiSemanticBadge key={stateKey} state={stateKey as keyof typeof AI_SEMANTIC_STATES} />
          ))}
        </div>
      );

      expect(screen.getByText('Fundamentada')).toBeVisible();
      expect(screen.getByText('Parcial')).toBeVisible();
      expect(screen.getByText('Conflitante')).toBeVisible();
      expect(screen.getByText('Inferida')).toBeVisible();
      expect(screen.getByText('Sem evidência')).toBeVisible();
      expect(screen.getByText('Obsoleta')).toBeVisible();
      expect(screen.getByText('Bloqueada')).toBeVisible();
      expect(screen.getByText('Inconclusiva')).toBeVisible();
    });
  });

  describe('Transparência do ActionReviewDialog: Destino, Escopo, Risco e Parâmetros', () => {
    it('exibe todos os elementos de compreensão de risco para uma ação de alto risco', () => {
      render(
        <ActionReviewDialog
          open={true}
          actionRequest={mockHighRiskRequest}
          onConfirm={() => sampleReceiptSuccess}
        />
      );

      expect(screen.getByText('Revisar ação')).toBeVisible();
      expect(screen.getByText('Reiniciar cluster de cache em produção')).toBeVisible();
      expect(screen.getByText('redis-prod-cluster')).toBeVisible();
      expect(screen.getByText('HIGH')).toBeVisible();
      expect(screen.getByText('Gerente de Operações (SRE)')).toBeVisible();
      expect(screen.getByText('cache-layer')).toBeVisible();
      expect(screen.getByText('session-store')).toBeVisible();
      expect(screen.getByText(/Exige confirmação explícita do operador/i)).toBeVisible();
    });

    it('impede a execução de ação bloqueada por policy e oculta o portão de confirmação', () => {
      render(
        <ActionReviewDialog
          open={true}
          actionRequest={mockBlockedRequest}
          onConfirm={() => sampleReceiptSuccess}
        />
      );

      expect(screen.getByText('Operação bloqueada')).toBeVisible();
      expect(screen.getByText(/Usuário não possui credencial de nível CISO/i)).toBeVisible();
      expect(screen.queryByRole('button', { name: /confirmar e executar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('garante que ações CRITICAL exigem token digitado e habilitam apenas no termo exato', () => {
      const handleConfirm = vi.fn().mockResolvedValue(sampleReceiptSuccess);

      render(
        <ActionReviewDialog
          open={true}
          actionRequest={mockCriticalRiskRequest}
          onConfirm={handleConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirmar e executar/i });
      expect(confirmButton).toBeDisabled();

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'TOKEN_ERRADO' } });
      expect(confirmButton).toBeDisabled();

      fireEvent.change(input, { target: { value: 'confirmar' } });
      expect(confirmButton).not.toBeDisabled();

      fireEvent.click(confirmButton);
      expect(handleConfirm).toHaveBeenCalledWith('confirmar');
    });
  });

  describe('Navegação e Temas (light/dark e default/compact)', () => {
    it.each([
      ['light', 'default'],
      ['dark', 'default'],
      ['light', 'compact'],
      ['dark', 'compact'],
    ] as const)('mantém ausência de violações WCAG (axe-core) no ActionReviewDialog em tema %s e densidade %s', async (theme, density) => {
      const { container } = render(
        <div data-theme={theme} data-density={density}>
          <ActionReviewDialog
            open={true}
            actionRequest={mockHighRiskRequest}
            onConfirm={() => sampleReceiptSuccess}
          />
        </div>
      );

      const results = await axe.run(document.body, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
        rules: { 'color-contrast': { enabled: false } },
      });

      expect(results.violations).toEqual([]);
    });
  });
});
