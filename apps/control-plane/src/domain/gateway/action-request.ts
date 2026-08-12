export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "KILLED";

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
  confirmationToken?: string;
  approvalId?: string;
  createdAt?: string;
}>;

export type ActionRequest = Readonly<
  ActionRequestInput & {
    status: ActionStatus;
    createdAt: string;
  }
>;

export type ActionReceiptInput = Readonly<{
  actionId: string;
  idempotencyKey: string;
  status: "SUCCESS" | "FAILED" | "INCONCLUSIVE" | "KILLED";
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  executedAt?: string;
}>;

export type ActionReceipt = Readonly<
  ActionReceiptInput & {
    executedAt: string;
  }
>;

export function createActionRequest(input: ActionRequestInput): ActionRequest {
  return Object.freeze({
    ...input,
    status: input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL" ? "PENDING_APPROVAL" : "APPROVED",
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export function createActionReceipt(input: ActionReceiptInput): ActionReceipt {
  return Object.freeze({
    ...input,
    executedAt: input.executedAt ?? new Date().toISOString(),
  });
}
