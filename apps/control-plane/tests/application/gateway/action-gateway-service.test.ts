import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../../dist/application/gateway/action-gateway-service.js";
import { KillSwitchGuard } from "../../../dist/domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../../dist/domain/gateway/idempotency.js";

describe("ActionGatewayService", () => {
  let killSwitch: KillSwitchGuard;
  let idempotency: IdempotencyService;
  let mockPolicyEngine: any;
  let mockGuardrailService: any;
  let mockConnector: any;
  let gateway: ActionGatewayService;

  beforeEach(() => {
    killSwitch = new KillSwitchGuard();
    idempotency = new IdempotencyService();
    mockPolicyEngine = {
      evaluatePolicy: async () => ({ decision: "ALLOW", allowedTools: ["github:create_issue"] }),
    };
    mockGuardrailService = {
      validatePreExecution: () => ({ allowed: true }),
    };
    mockConnector = {
      execute: async () => ({ issueNumber: 101 }),
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
  });
});
