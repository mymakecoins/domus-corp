// apps/control-plane/src/application/gateway/action-gateway-service.ts
import { ActionRequestInput, ActionReceipt, createActionRequest, createActionReceipt } from "../../domain/gateway/action-request.js";
import { KillSwitchGuard } from "../../domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../domain/gateway/idempotency.js";
import { ActionConnector } from "../../domain/gateway/action-connector.js";
import { ToolGuardrailService } from "../mcp/tool-guardrail-service.js";

export type ActionGatewayDependencies = Readonly<{
  killSwitch: KillSwitchGuard;
  idempotency: IdempotencyService;
  getPolicy: (tenantId: string, workspaceId: string, userId: string) => Promise<{ decision: string; allowedTools?: string[] }>;
  toolGuardrailService?: ToolGuardrailService;
  defaultConnector: ActionConnector;
  maxRetries?: number;
  retryBackoffMs?: number;
  inFlightTimeoutMs?: number;
  now?: () => string;
}>;

export class ActionGatewayService {
  private readonly killSwitch: KillSwitchGuard;
  private readonly idempotency: IdempotencyService;
  private readonly getPolicy: ActionGatewayDependencies["getPolicy"];
  private readonly toolGuardrailService?: ToolGuardrailService;
  private readonly defaultConnector: ActionConnector;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly inFlightTimeoutMs: number;
  private readonly now: () => string;

  constructor(deps: ActionGatewayDependencies) {
    this.killSwitch = deps.killSwitch;
    this.idempotency = deps.idempotency;
    this.getPolicy = deps.getPolicy;
    this.toolGuardrailService = deps.toolGuardrailService;
    this.defaultConnector = deps.defaultConnector;
    this.maxRetries = deps.maxRetries ?? 3;
    this.retryBackoffMs = deps.retryBackoffMs ?? 50;
    this.inFlightTimeoutMs = deps.inFlightTimeoutMs ?? 5000;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async executeAction(input: ActionRequestInput): Promise<ActionReceipt> {
    const existingReceipt = await this.idempotency.getReceipt(input.idempotencyKey);
    if (existingReceipt) {
      return existingReceipt;
    }

    const reservation = await this.idempotency.reserveInFlight(input.idempotencyKey, {
      actionId: input.actionId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      userId: input.userId,
    });

    if (reservation === "COMPLETED") {
      const receipt = await this.idempotency.getReceipt(input.idempotencyKey);
      if (receipt) return receipt;
    }

    if (reservation === "IN_PROGRESS") {
      const inProgressReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        operation: input.actionType,
        tool: input.target,
        actor: input.userId,
        status: "IN_PROGRESS",
        error: "ACTION_EXECUTION_IN_PROGRESS",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        attemptNumber: 1,
        maxRetries: this.maxRetries,
        createdAt: input.createdAt ?? this.now(),
        executedAt: this.now(),
      });
      return inProgressReceipt;
    }

    const request = createActionRequest(input);

    if (this.killSwitch.isKilled(input.tenantId, input.workspaceId)) {
      const killedReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        correlationId: request.correlationId,
        operation: input.actionType,
        tool: input.target,
        actor: input.userId,
        status: "KILLED",
        error: "ACTION_KILLED_BY_KILL_SWITCH",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        attemptNumber: 1,
        maxRetries: this.maxRetries,
        createdAt: request.createdAt,
        executedAt: this.now(),
      });
      await this.idempotency.saveReceipt(input.idempotencyKey, killedReceipt);
      return killedReceipt;
    }

    try {
      const policy = await this.getPolicy(input.tenantId, input.workspaceId, input.userId);
      if (policy.decision !== "ALLOW") {
        await this.idempotency.clearInFlight(input.idempotencyKey);
        throw new Error("ACTION_POLICY_DENIED");
      }

      if (this.toolGuardrailService) {
        this.toolGuardrailService.validatePreExecution({
          toolId: request.target,
          riskLevel: request.riskLevel,
          parameters: request.parameters,
          confirmationToken: request.confirmationToken,
          approvalId: request.approvalId,
        });
      } else if (request.status === "PENDING_APPROVAL") {
        if (!request.confirmationToken && !request.approvalId) {
          await this.idempotency.clearInFlight(input.idempotencyKey);
          throw new Error("MCP_APPROVAL_REQUIRED");
        }
      }
    } catch (err) {
      await this.idempotency.clearInFlight(input.idempotencyKey);
      throw err;
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const rawResult = await this.defaultConnector.execute({
          ...request.parameters,
          target: request.target,
          actionType: request.actionType,
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          idempotencyKey: request.idempotencyKey,
          parameters: request.parameters,
        });
        const receipt = createActionReceipt({
          actionId: request.actionId,
          idempotencyKey: request.idempotencyKey,
          correlationId: request.correlationId,
          operation: request.actionType,
          tool: request.target,
          actor: request.userId,
          status: "SUCCESS",
          result: rawResult,
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          attemptNumber: attempt,
          maxRetries: this.maxRetries,
          createdAt: request.createdAt,
          executedAt: this.now(),
        });
        await this.idempotency.saveReceipt(request.idempotencyKey, receipt);
        return receipt;
      } catch (err: any) {
        const isPostDispatchTimeout = err?.isTimeoutPostDispatch || err?.message?.includes("POST_DISPATCH_TIMEOUT");
        const isTransient = err?.isTransient || err?.message?.includes("TRANSIENT");

        if (isPostDispatchTimeout) {
          if (this.defaultConnector.checkStatus) {
            try {
              const statusCheck = await this.defaultConnector.checkStatus(request.idempotencyKey);
              if (statusCheck.executed) {
                const confirmedReceipt = createActionReceipt({
                  actionId: request.actionId,
                  idempotencyKey: request.idempotencyKey,
                  correlationId: request.correlationId,
                  operation: request.actionType,
                  tool: request.target,
                  actor: request.userId,
                  status: "SUCCESS",
                  result: statusCheck.result,
                  tenantId: request.tenantId,
                  workspaceId: request.workspaceId,
                  userId: request.userId,
                  attemptNumber: attempt,
                  maxRetries: this.maxRetries,
                  createdAt: request.createdAt,
                  executedAt: this.now(),
                });
                await this.idempotency.saveReceipt(request.idempotencyKey, confirmedReceipt);
                return confirmedReceipt;
              }
            } catch {
              // Status check failed; fall through to INCONCLUSIVE
            }
          }

          const inconclusiveReceipt = createActionReceipt({
            actionId: request.actionId,
            idempotencyKey: request.idempotencyKey,
            correlationId: request.correlationId,
            operation: request.actionType,
            tool: request.target,
            actor: request.userId,
            status: "INCONCLUSIVE",
            error: err.message || "ACTION_EXECUTION_TIMED_OUT_AMBIGUOUS",
            tenantId: request.tenantId,
            workspaceId: request.workspaceId,
            userId: request.userId,
            attemptNumber: attempt,
            maxRetries: this.maxRetries,
            createdAt: request.createdAt,
            executedAt: this.now(),
          });
          await this.idempotency.saveReceipt(request.idempotencyKey, inconclusiveReceipt);
          return inconclusiveReceipt;
        }

        if (isTransient && attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryBackoffMs * Math.pow(2, attempt - 1)));
          continue;
        }

        const failedReceipt = createActionReceipt({
          actionId: request.actionId,
          idempotencyKey: request.idempotencyKey,
          correlationId: request.correlationId,
          operation: request.actionType,
          tool: request.target,
          actor: request.userId,
          status: "FAILED",
          error: err.message || "ACTION_EXECUTION_FAILED",
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          attemptNumber: attempt,
          maxRetries: this.maxRetries,
          createdAt: request.createdAt,
          executedAt: this.now(),
        });
        await this.idempotency.saveReceipt(request.idempotencyKey, failedReceipt);
        return failedReceipt;
      }
    }

    const exhaustedReceipt = createActionReceipt({
      actionId: request.actionId,
      idempotencyKey: request.idempotencyKey,
      correlationId: request.correlationId,
      operation: request.actionType,
      tool: request.target,
      actor: request.userId,
      status: "FAILED",
      error: "ACTION_RETRIES_EXHAUSTED",
      tenantId: request.tenantId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      attemptNumber: this.maxRetries,
      maxRetries: this.maxRetries,
      createdAt: request.createdAt,
      executedAt: this.now(),
    });
    await this.idempotency.saveReceipt(request.idempotencyKey, exhaustedReceipt);
    return exhaustedReceipt;
  }

  async reconcileAction(idempotencyKey: string): Promise<ActionReceipt | null> {
    const existingReceipt = await this.idempotency.getReceipt(idempotencyKey);
    if (!existingReceipt) {
      return null;
    }

    if (existingReceipt.status !== "INCONCLUSIVE") {
      return existingReceipt;
    }

    if (this.defaultConnector.checkStatus) {
      try {
        const statusCheck = await this.defaultConnector.checkStatus(idempotencyKey);
        if (statusCheck.executed) {
          const confirmedReceipt = createActionReceipt({
            actionId: existingReceipt.actionId,
            idempotencyKey: existingReceipt.idempotencyKey,
            correlationId: existingReceipt.correlationId,
            operation: existingReceipt.operation,
            tool: existingReceipt.tool,
            actor: existingReceipt.actor,
            status: "SUCCESS",
            result: statusCheck.result,
            tenantId: existingReceipt.tenantId,
            workspaceId: existingReceipt.workspaceId,
            userId: existingReceipt.userId,
            attemptNumber: existingReceipt.attemptNumber,
            maxRetries: existingReceipt.maxRetries,
            createdAt: existingReceipt.createdAt,
            executedAt: this.now(),
          });
          await this.idempotency.saveReceipt(idempotencyKey, confirmedReceipt);
          return confirmedReceipt;
        } else if (statusCheck.error) {
          const failedReceipt = createActionReceipt({
            actionId: existingReceipt.actionId,
            idempotencyKey: existingReceipt.idempotencyKey,
            correlationId: existingReceipt.correlationId,
            operation: existingReceipt.operation,
            tool: existingReceipt.tool,
            actor: existingReceipt.actor,
            status: "FAILED",
            error: statusCheck.error,
            tenantId: existingReceipt.tenantId,
            workspaceId: existingReceipt.workspaceId,
            userId: existingReceipt.userId,
            attemptNumber: existingReceipt.attemptNumber,
            maxRetries: existingReceipt.maxRetries,
            createdAt: existingReceipt.createdAt,
            executedAt: this.now(),
          });
          await this.idempotency.saveReceipt(idempotencyKey, failedReceipt);
          return failedReceipt;
        }
      } catch {
        // Status check failed or unavailable; retain INCONCLUSIVE receipt
      }
    }

    return existingReceipt;
  }
}
