import axe from 'axe-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ActionConfirmationGate,
  ActionReceiptView,
  ActionReviewDialog,
  type ActionReceiptPayload,
  type ActionRequestPayload,
} from '../src/index.js';

describe('ActionReview Integration and Accessibility', () => {
  const sampleRequestCritical: ActionRequestPayload = {
    id: 'req-crit-1',
    intent: 'Destruição de banco de dados em produção',
    targetSystem: 'postgres-primary-prod',
    riskLevel: 'CRITICAL',
    redactedParams: { database: 'domus_db_prod', force: 'true' },
    affectedScope: ['database-cluster', 'user-data'],
    requiredApproval: 'CISO / VP of Engineering',
    policyDecision: 'conditioned',
    policyReason: 'Ação crítica exige autorização e confirmação por digitação de token.',
    budgetUsage: { used: 90, limit: 100 },
    isDestructive: true,
  };

  const sampleRequestHigh: ActionRequestPayload = {
    id: 'req-high-1',
    intent: 'Revogação em massa de chaves API',
    targetSystem: 'api-gateway',
    riskLevel: 'HIGH',
    redactedParams: { tenantId: 'tenant-all' },
    affectedScope: ['api-gateway', 'active-sessions'],
    requiredApproval: 'Tech Lead',
    policyDecision: 'allowed',
    policyReason: 'Ação de alto risco permitida com confirmação explícita de responsabilidade.',
    budgetUsage: { used: 40, limit: 100 },
    isDestructive: true,
  };

  const sampleReceipt: ActionReceiptPayload = {
    receiptId: 'rcpt-action-777',
    correlationId: 'corr-action-888',
    status: 'SUCCESS',
    semanticState: 'fundamentada',
    executedAt: '2026-08-12T12:45:00Z',
    summary: 'Ação de auto-remediação concluída com sucesso.',
    auditUrl: 'https://audit.domus.corp/receipts/rcpt-action-777',
  };

  it('trava o botão no nível CRITICAL até a digitação exata do token de confirmação', () => {
    const handleConfirm = vi.fn().mockResolvedValue(sampleReceipt);

    render(
      <ActionReviewDialog
        open={true}
        actionRequest={sampleRequestCritical}
        onConfirm={handleConfirm}
      />
    );

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).toBeDisabled();

    const input = screen.getByRole('textbox');

    // Digitação incorreta
    fireEvent.change(input, { target: { value: 'CONFIRMAR-ERRADO' } });
    expect(button).toBeDisabled();

    // Digitação correta (padrão 'CONFIRMAR', case-insensitive)
    fireEvent.change(input, { target: { value: 'confirmar' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledWith('confirmar');
  });

  it('trava o botão no nível HIGH até marcar o checkbox de responsabilidade', () => {
    const handleConfirm = vi.fn().mockResolvedValue(sampleReceipt);

    render(
      <ActionReviewDialog
        open={true}
        actionRequest={sampleRequestHigh}
        onConfirm={handleConfirm}
      />
    );

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    // Marca o checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(button).not.toBeDisabled();

    // Desmarca o checkbox
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(button).toBeDisabled();

    // Marca novamente e executa
    fireEvent.click(checkbox);
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('processa a execução, transita para a tela de recibo e permite a conclusão', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(sampleReceipt);
    const handleClose = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ActionReviewDialog
        open={true}
        actionRequest={sampleRequestHigh}
        onConfirm={handleConfirm}
        onClose={handleClose}
        onOpenChange={handleOpenChange}
      />
    );

    // Habilita e confirma
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const confirmButton = screen.getByRole('button', { name: /confirmar e executar/i });
    fireEvent.click(confirmButton);

    // Aguarda a transição para a tela de recibo
    const summaryElement = await screen.findByText('Ação de auto-remediação concluída com sucesso.');
    expect(summaryElement).toBeVisible();
    expect(screen.getByText('rcpt-action-777')).toBeVisible();
    expect(screen.getByText('corr-action-888')).toBeVisible();

    // Clica em "Concluir e Fechar"
    const finishButton = screen.getByRole('button', { name: /concluir e fechar/i });
    expect(finishButton).toBeVisible();
    fireEvent.click(finishButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('não possui violações de acessibilidade (axe-core) no ActionReviewDialog aberto', async () => {
    render(
      <ActionReviewDialog
        open={true}
        actionRequest={sampleRequestCritical}
        onConfirm={async () => sampleReceipt}
      />
    );

    const result = await axe.run(document.body, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});
