export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "KILLED";

export type ActionReceiptStatus = "SUCCESS" | "FAILED" | "INCONCLUSIVE" | "KILLED" | "IN_PROGRESS";

export type ActionRequestInput = Readonly<{
  actionId: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  actionType: string;
  target: string;
  parameters: Record<string, unknown>;
  riskLevel: ActionRiskLevel;
  idempotencyKey: string;
  correlationId?: string;
  confirmationToken?: string;
  approvalId?: string;
  createdAt?: string;
}>;

export type ActionRequest = Readonly<
  ActionRequestInput & {
    status: ActionStatus;
    createdAt: string;
    correlationId: string;
  }
>;

export type ActionReceiptInput = Readonly<{
  actionId: string;
  idempotencyKey: string;
  correlationId?: string;
  operation?: string;
  tool?: string;
  actor?: string;
  status: ActionReceiptStatus;
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  attemptNumber?: number;
  maxRetries?: number;
  createdAt?: string;
  executedAt?: string;
}>;

export type ActionReceipt = Readonly<{
  actionId: string;
  idempotencyKey: string;
  correlationId: string;
  operation: string;
  tool: string;
  actor: string;
  status: ActionReceiptStatus;
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  attemptNumber: number;
  maxRetries: number;
  createdAt: string;
  executedAt: string;
}>;

export function createActionRequest(input: ActionRequestInput): ActionRequest {
  const now = input.createdAt ?? new Date().toISOString();
  return Object.freeze({
    ...input,
    correlationId: input.correlationId ?? input.idempotencyKey,
    status: input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL" ? "PENDING_APPROVAL" : "APPROVED",
    createdAt: now,
  });
}

export function createActionReceipt(input: ActionReceiptInput): ActionReceipt {
  const now = new Date().toISOString();
  return Object.freeze({
    actionId: input.actionId,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId ?? input.idempotencyKey,
    operation: input.operation ?? "unknown_operation",
    tool: input.tool ?? "unknown_tool",
    actor: input.actor ?? input.userId,
    status: input.status,
    result: input.result,
    error: input.error,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    attemptNumber: input.attemptNumber ?? 1,
    maxRetries: input.maxRetries ?? 1,
    createdAt: input.createdAt ?? now,
    executedAt: input.executedAt ?? now,
  });
}
