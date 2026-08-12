import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createActionRequest, createActionReceipt } from "../../../dist/domain/gateway/action-request.js";

describe("ActionRequest Domain Model", () => {
  it("creates a valid frozen ActionRequest object", () => {
    const req = createActionRequest({
      actionId: "act-123",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: { title: "Bug fix" },
      riskLevel: "HIGH",
      idempotencyKey: "idem-key-1",
    });

    assert.equal(req.actionId, "act-123");
    assert.equal(req.riskLevel, "HIGH");
    assert.equal(req.status, "PENDING_APPROVAL");
    assert.equal(Object.isFrozen(req), true);
  });

  it("creates a valid frozen ActionReceipt object", () => {
    const receipt = createActionReceipt({
      actionId: "act-123",
      idempotencyKey: "idem-key-1",
      status: "SUCCESS",
      result: { issueNumber: 42 },
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      executedAt: "2026-08-12T12:00:00.000Z",
    });

    assert.equal(receipt.actionId, "act-123");
    assert.equal(receipt.status, "SUCCESS");
    assert.equal(Object.isFrozen(receipt), true);
  });
});
