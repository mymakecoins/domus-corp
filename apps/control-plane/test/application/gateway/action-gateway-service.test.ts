import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../../src/application/gateway/action-gateway-service.js";
import { KillSwitchGuard } from "../../../src/domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../../src/domain/gateway/idempotency.js";

describe("ActionGatewayService", () => {
  let killSwitch: KillSwitchGuard;
  let idempotency: IdempotencyService;
  let mockPolicyEngine: { evaluatePolicy: (tenantId: string, workspaceId: string, userId: string) => Promise<{ decision: string; allowedTools?: string[] }> };
  let mockGuardrailService: { validatePreExecution: (input: any) => { allowed: boolean }; validateCount: number };
  let mockConnector: { execute: (input: any) => Promise<any>; callCount: number };
  let gateway: ActionGatewayService;

  beforeEach(() => {
    killSwitch = new KillSwitchGuard();
    idempotency = new IdempotencyService();
    mockPolicyEngine = {
      evaluatePolicy: async () => ({ decision: "ALLOW", allowedTools: ["github:create_issue"] }),
    };
    mockGuardrailService = {
      validateCount: 0,
      validatePreExecution: () => {
        mockGuardrailService.validateCount++;
        return { allowed: true };
      },
    };
    mockConnector = {
      callCount: 0,
      execute: async (params: any) => {
        mockConnector.callCount++;
        return { issueNumber: 101 };
      },
    };

    gateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      toolGuardrailService: mockGuardrailService as any,
      defaultConnector: mockConnector as any,
    });
  });

  it("executes valid action successfully and generates ActionReceipt", async () => {
    const receipt = await gateway.executeAction({
      actionId: "act-1",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: { title: "Fix bug" },
      riskLevel: "LOW",
      idempotencyKey: "idem-1",
    });

    assert.equal(receipt.status, "SUCCESS");
    assert.deepEqual(receipt.result, { issueNumber: 101 });
  });

  it("blocks execution fail-closed if Kill Switch is active", async () => {
    killSwitch.activateGlobal();

    const receipt = await gateway.executeAction({
      actionId: "act-2",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-2",
    });

    assert.equal(receipt.status, "KILLED");
    assert.equal(receipt.error, "ACTION_KILLED_BY_KILL_SWITCH");
    assert.equal(mockConnector.callCount, 0);
  });

  it("returns cached receipt on idempotent replay", async () => {
    await gateway.executeAction({
      actionId: "act-1",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-3",
    });

    const secondReceipt = await gateway.executeAction({
      actionId: "act-1-replay",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-3",
    });

    assert.equal(secondReceipt.status, "SUCCESS");
    assert.equal(mockConnector.callCount, 1);
  });

  it("throws error if policy engine denies execution", async () => {
    const deniedGateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: async () => ({ decision: "DENY" }),
      defaultConnector: mockConnector as any,
    });

    await assert.rejects(
      async () => {
        await deniedGateway.executeAction({
          actionId: "act-denied",
          tenantId: "t-1",
          workspaceId: "w-1",
          userId: "u-1",
          actionType: "mcp:tool_call",
          target: "github:delete_repo",
          parameters: {},
          riskLevel: "HIGH",
          idempotencyKey: "idem-denied",
        });
      },
      (err: any) => err.message === "ACTION_POLICY_DENIED"
    );
  });

  it("saves FAILED receipt if connector execution throws an error", async () => {
    const failingConnector = {
      execute: async () => {
        throw new Error("CONNECTOR_TIMEOUT");
      },
    };

    const failingGateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      defaultConnector: failingConnector as any,
    });

    const receipt = await failingGateway.executeAction({
      actionId: "act-fail",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-fail",
    });

    assert.equal(receipt.status, "FAILED");
    assert.equal(receipt.error, "CONNECTOR_TIMEOUT");
  });

  it("returns INCONCLUSIVE receipt when post-dispatch timeout occurs without status check", async () => {
    let attemptCount = 0;
    const timeoutConnector = {
      execute: async () => {
        attemptCount++;
        const err = new Error("POST_DISPATCH_TIMEOUT");
        (err as any).isTimeoutPostDispatch = true;
        throw err;
      },
    };

    const timeoutGateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      defaultConnector: timeoutConnector as any,
      maxRetries: 2,
      retryBackoffMs: 1,
    });

    const receipt = await timeoutGateway.executeAction({
      actionId: "act-timeout",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "post_message",
      target: "slack",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "key-timeout-1",
    });

    assert.equal(receipt.status, "INCONCLUSIVE");
    assert.equal(receipt.attemptNumber, 1);
    assert.equal(attemptCount, 1); // Does not retry blindly post-dispatch timeout
  });

  it("retries transient pre-dispatch errors up to maxRetries", async () => {
    let attemptCount = 0;
    const retryConnector = {
      execute: async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const err = new Error("NETWORK_TRANSIENT_503");
          (err as any).isTransient = true;
          throw err;
        }
        return { ok: true };
      },
    };

    const retryGateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      defaultConnector: retryConnector as any,
      maxRetries: 3,
      retryBackoffMs: 1,
    });

    const receipt = await retryGateway.executeAction({
      actionId: "act-retry",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "send_email",
      target: "gmail",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "key-retry-1",
    });

    assert.equal(receipt.status, "SUCCESS");
    assert.equal(receipt.attemptNumber, 3);
    assert.equal(attemptCount, 3);
  });

  it("queries connector checkStatus on post-dispatch timeout if supported", async () => {
    const statusCheckingConnector = {
      execute: async () => {
        const err = new Error("POST_DISPATCH_TIMEOUT");
        (err as any).isTimeoutPostDispatch = true;
        throw err;
      },
      checkStatus: async (key: string) => {
        assert.equal(key, "key-status-check-1");
        return { executed: true, result: { messageId: "msg-999" } };
      },
    };

    const gateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      defaultConnector: statusCheckingConnector as any,
      maxRetries: 2,
      retryBackoffMs: 1,
    });

    const receipt = await gateway.executeAction({
      actionId: "act-check-status",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "send_notification",
      target: "teams",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "key-status-check-1",
    });

    assert.equal(receipt.status, "SUCCESS");
    assert.deepEqual(receipt.result, { messageId: "msg-999" });
  });
});
