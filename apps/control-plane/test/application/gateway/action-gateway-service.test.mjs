import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../../dist/application/gateway/action-gateway-service.js";
import { KillSwitchGuard } from "../../../dist/domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../../dist/domain/gateway/idempotency.js";

describe("ActionGatewayService", () => {
  let killSwitch;
  let idempotency;
  let mockPolicyEngine;
  let mockGuardrailService;
  let mockConnector;
  let gateway;

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
      execute: async (params) => {
        mockConnector.callCount++;
        return { issueNumber: 101 };
      },
    };

    gateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      toolGuardrailService: mockGuardrailService,
      defaultConnector: mockConnector,
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
      defaultConnector: mockConnector,
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
      (err) => err.message === "ACTION_POLICY_DENIED"
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
      defaultConnector: failingConnector,
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
});
