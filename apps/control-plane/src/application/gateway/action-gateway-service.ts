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
  now?: () => string;
}>;

export class ActionGatewayService {
  private readonly killSwitch: KillSwitchGuard;
  private readonly idempotency: IdempotencyService;
  private readonly getPolicy: ActionGatewayDependencies["getPolicy"];
  private readonly toolGuardrailService?: ToolGuardrailService;
  private readonly defaultConnector: ActionConnector;
  private readonly now: () => string;

  constructor(deps: ActionGatewayDependencies) {
    this.killSwitch = deps.killSwitch;
    this.idempotency = deps.idempotency;
    this.getPolicy = deps.getPolicy;
    this.toolGuardrailService = deps.toolGuardrailService;
    this.defaultConnector = deps.defaultConnector;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async executeAction(input: ActionRequestInput): Promise<ActionReceipt> {
    const existingReceipt = this.idempotency.getReceipt(input.idempotencyKey);
    if (existingReceipt) {
      return existingReceipt;
    }

    if (this.killSwitch.isKilled(input.tenantId, input.workspaceId)) {
      const killedReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        status: "KILLED",
        error: "ACTION_KILLED_BY_KILL_SWITCH",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(input.idempotencyKey, killedReceipt);
      return killedReceipt;
    }

    const policy = await this.getPolicy(input.tenantId, input.workspaceId, input.userId);
    if (policy.decision !== "ALLOW") {
      throw new Error("ACTION_POLICY_DENIED");
    }

    const request = createActionRequest(input);

    if (this.toolGuardrailService) {
      this.toolGuardrailService.validatePreExecution({
        toolId: request.target,
        riskLevel: request.riskLevel,
        parameters: request.parameters,
        confirmationToken: request.confirmationToken,
        approvalId: request.approvalId,
      });
    }

    try {
      const rawResult = await this.defaultConnector.execute(request.parameters);
      const receipt = createActionReceipt({
        actionId: request.actionId,
        idempotencyKey: request.idempotencyKey,
        status: "SUCCESS",
        result: rawResult,
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        userId: request.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(request.idempotencyKey, receipt);
      return receipt;
    } catch (err: any) {
      const failedReceipt = createActionReceipt({
        actionId: request.actionId,
        idempotencyKey: request.idempotencyKey,
        status: "FAILED",
        error: err.message || "ACTION_EXECUTION_FAILED",
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        userId: request.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(request.idempotencyKey, failedReceipt);
      return failedReceipt;
    }
  }
}
