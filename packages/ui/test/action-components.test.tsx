import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  ActionConfirmationGate,
  ActionReceiptView,
  ActionReviewDialog,
  BudgetMeter,
  PolicyDecisionBanner,
  type ActionReceiptPayload,
  type ActionRequestPayload,
} from '../src/index.js';

describe('ActionConfirmationGate', () => {
  it('habilita o botão diretamente para nível LOW', () => {
    const handleConfirm = vi.fn();
    render(<ActionConfirmationGate riskLevel="LOW" onConfirm={handleConfirm} />);

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('habilita o botão diretamente para nível MEDIUM', () => {
    const handleConfirm = vi.fn();
    render(<ActionConfirmationGate riskLevel="MEDIUM" onConfirm={handleConfirm} />);

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).not.toBeDisabled();
  });

  it('exige marcação do checkbox no nível HIGH para habilitar o botão', () => {
    const handleConfirm = vi.fn();
    render(<ActionConfirmationGate riskLevel="HIGH" onConfirm={handleConfirm} />);

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('exige digitação do termo exato (case-insensitive) no nível CRITICAL', () => {
    const handleConfirm = vi.fn();
    render(
      <ActionConfirmationGate
        riskLevel="CRITICAL"
        confirmationTerm="DELETAR-DB"
        onConfirm={handleConfirm}
      />
    );

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).toBeDisabled();

    const input = screen.getByRole('textbox');
    
    // Texto incorreto
    fireEvent.change(input, { target: { value: 'ERRADO' } });
    expect(button).toBeDisabled();

    // Texto correto em caixa baixa (case-insensitive)
    fireEvent.change(input, { target: { value: 'deletar-db' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('usa o termo padrão "CONFIRMAR" quando confirmationTerm não é informado no nível CRITICAL', () => {
    render(<ActionConfirmationGate riskLevel="CRITICAL" onConfirm={() => {}} />);

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button).toBeDisabled();

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'confirmar' } });
    expect(button).not.toBeDisabled();
  });

  it('aplica variante destructive quando isDestructive é true', () => {
    render(<ActionConfirmationGate riskLevel="LOW" isDestructive={true} onConfirm={() => {}} />);

    const button = screen.getByRole('button', { name: /confirmar e executar/i });
    expect(button.className).toContain('bg-destructive');
  });

  it('desabilita o botão quando isLoading é true', () => {
    render(<ActionConfirmationGate riskLevel="LOW" isLoading={true} onConfirm={() => {}} />);

    const button = screen.getByRole('button', { name: /executando\.\.\./i });
    expect(button).toBeDisabled();
  });
});

describe('ActionReceiptView', () => {
  const sampleReceipt: ActionReceiptPayload = {
    receiptId: 'rcpt-12345',
    correlationId: 'corr-998877',
    status: 'SUCCESS',
    semanticState: 'fundamentada',
    executedAt: '2026-08-12T12:00:00Z',
    summary: 'Ação de reconfiguração de firewall executada com sucesso.',
    auditUrl: 'https://audit.domus.corp/rcpt-12345',
  };

  it('renderiza os dados completos do recibo com status SUCCESS', () => {
    render(<ActionReceiptView receipt={sampleReceipt} />);

    expect(screen.getByText('Sucesso')).toBeVisible();
    expect(screen.getByText('Fundamentada')).toBeVisible();
    expect(screen.getByText('Ação de reconfiguração de firewall executada com sucesso.')).toBeVisible();
    expect(screen.getByText('rcpt-12345')).toBeVisible();
    expect(screen.getByText('corr-998877')).toBeVisible();
    expect(screen.getByText('2026-08-12T12:00:00Z')).toBeVisible();

    const auditLink = screen.getByRole('link', { name: /ver trilha de auditoria/i });
    expect(auditLink).toHaveAttribute('href', 'https://audit.domus.corp/rcpt-12345');
  });

  it('renderiza os badges de status para FAILED, KILLED e INCONCLUSIVE', () => {
    const { rerender } = render(
      <ActionReceiptView receipt={{ ...sampleReceipt, status: 'FAILED' }} />
    );
    expect(screen.getByText('Falha')).toBeVisible();

    rerender(<ActionReceiptView receipt={{ ...sampleReceipt, status: 'KILLED' }} />);
    expect(screen.getByText('Interrompido')).toBeVisible();

    rerender(<ActionReceiptView receipt={{ ...sampleReceipt, status: 'INCONCLUSIVE' }} />);
    expect(screen.getByText('Inconclusivo')).toBeVisible();
  });

  it('renderiza e aciona nextAction quando fornecido', () => {
    const handleNextAction = vi.fn();
    const receiptWithNext: ActionReceiptPayload = {
      ...sampleReceipt,
      nextAction: {
        id: 'next-1',
        label: 'Verificar logs',
        onClick: handleNextAction,
      },
    };

    render(<ActionReceiptView receipt={receiptWithNext} />);
    const nextBtn = screen.getByRole('button', { name: /verificar logs/i });
    expect(nextBtn).toBeVisible();

    fireEvent.click(nextBtn);
    expect(handleNextAction).toHaveBeenCalledTimes(1);
  });
});

describe('PolicyDecisionBanner', () => {
  it('renderiza operação permitida para decision="allowed"', () => {
    render(<PolicyDecisionBanner decision="allowed">Permissão OK</PolicyDecisionBanner>);
    expect(screen.getByText('Operação permitida')).toBeVisible();
    expect(screen.getByText('Permissão OK')).toBeVisible();
  });

  it('renderiza operação condicionada para decision="conditioned"', () => {
    render(<PolicyDecisionBanner decision="conditioned">Requer aprovação prévia</PolicyDecisionBanner>);
    expect(screen.getByText('Operação condicionada')).toBeVisible();
    expect(screen.getByText('Requer aprovação prévia')).toBeVisible();
  });

  it('renderiza operação bloqueada para decision="denied" ou "blocked"', () => {
    const { rerender } = render(<PolicyDecisionBanner decision="denied">Acesso negado</PolicyDecisionBanner>);
    expect(screen.getByText('Operação bloqueada')).toBeVisible();

    rerender(<PolicyDecisionBanner decision="blocked">Policy impede esta ação</PolicyDecisionBanner>);
    expect(screen.getByText('Operação bloqueada')).toBeVisible();
  });
});

describe('BudgetMeter', () => {
  it('exibe consumo de orçamento e calcula percentual', () => {
    render(<BudgetMeter used={50} limit={100} label="Cota de API" />);
    expect(screen.getByText('Cota de API')).toBeVisible();
    expect(screen.getByText('50 de 100 (50%)')).toBeVisible();
  });

  it('adiciona classe de aviso quando o consumo atinge 80% ou mais', () => {
    const { container } = render(<BudgetMeter used={85} limit={100} />);
    expect(container.firstChild).toHaveClass('meter-warning');
  });
});

describe('ActionReviewDialog', () => {
  const baseRequest: ActionRequestPayload = {
    id: 'req-1',
    intent: 'Reiniciar serviço de autenticação',
    targetSystem: 'auth-cluster-prod',
    riskLevel: 'LOW',
    redactedParams: { secretToken: '***', env: 'production' },
    affectedScope: ['auth-service', 'session-db'],
    requiredApproval: 'Security Lead',
    policyDecision: 'allowed',
    policyReason: 'Ação autorizada pela política SEC-01.',
    budgetUsage: { used: 30, limit: 100 },
    isDestructive: false,
  };

  const sampleReceipt: ActionReceiptPayload = {
    receiptId: 'rcpt-999',
    correlationId: 'corr-888',
    status: 'SUCCESS',
    semanticState: 'fundamentada',
    executedAt: '2026-08-12T12:30:00Z',
    summary: 'Serviço de autenticação reiniciado com sucesso.',
  };

  it('renderiza os dados completos da solicitação de ação', () => {
    render(<ActionReviewDialog open={true} actionRequest={baseRequest} onConfirm={() => sampleReceipt} />);

    expect(screen.getByText('Revisar ação')).toBeVisible();
    expect(screen.getByText('Reiniciar serviço de autenticação')).toBeVisible();
    expect(screen.getByText('auth-cluster-prod')).toBeVisible();
    expect(screen.getByText('LOW')).toBeVisible();
    expect(screen.getByText('Security Lead')).toBeVisible();
    expect(screen.getByText('auth-service')).toBeVisible();
    expect(screen.getByText('session-db')).toBeVisible();
    expect(screen.getByText('Ação autorizada pela política SEC-01.')).toBeVisible();
    expect(screen.getByText('30 de 100 (30%)')).toBeVisible();
    expect(screen.getByRole('button', { name: /confirmar e executar/i })).toBeVisible();
  });

  it('não renderiza o gate de confirmação quando a política é denied ou blocked', () => {
    const deniedRequest: ActionRequestPayload = {
      ...baseRequest,
      policyDecision: 'denied',
      policyReason: 'Ação não permitida fora da janela de manutenção.',
    };

    render(<ActionReviewDialog open={true} actionRequest={deniedRequest} onConfirm={() => sampleReceipt} />);

    expect(screen.getByText('Operação bloqueada')).toBeVisible();
    expect(screen.getByText('Ação não permitida fora da janela de manutenção.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /confirmar e executar/i })).toBeNull();
  });

  it('executa o fluxo de confirmação e exibe o recibo e botão de conclusão', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(sampleReceipt);
    const handleClose = vi.fn();

    render(
      <ActionReviewDialog
        open={true}
        actionRequest={baseRequest}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /confirmar e executar/i });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const summaryText = await screen.findByText('Serviço de autenticação reiniciado com sucesso.');
    expect(summaryText).toBeVisible();

    const finishBtn = screen.getByRole('button', { name: /concluir e fechar/i });
    expect(finishBtn).toBeVisible();

    fireEvent.click(finishBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('exibe alerta de erro se a execução falhar', async () => {
    const handleConfirm = vi.fn().mockRejectedValue(new Error('Falha na comunicação com o cluster'));

    render(<ActionReviewDialog open={true} actionRequest={baseRequest} onConfirm={handleConfirm} />);

    const confirmBtn = screen.getByRole('button', { name: /confirmar e executar/i });
    fireEvent.click(confirmBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(screen.getByText('Falha na comunicação com o cluster')).toBeVisible();
  });
});

