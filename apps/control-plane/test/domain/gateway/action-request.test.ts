import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createActionRequest, createActionReceipt } from "../../../src/domain/gateway/action-request.js";

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

  it("createActionReceipt populates all fields including correlation, operation, tool, actor and attempt metadata", () => {
    const receipt = createActionReceipt({
      actionId: "act-101",
      idempotencyKey: "idem-key-101",
      correlationId: "trace-101",
      operation: "create_issue",
      tool: "jira_mcp",
      actor: "usr-456",
      status: "SUCCESS",
      result: { issueKey: "DOM-1" },
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "usr-456",
      attemptNumber: 1,
      maxRetries: 3,
      createdAt: "2026-08-12T14:00:00.000Z",
      executedAt: "2026-08-12T14:00:01.000Z",
    });

    assert.equal(receipt.actionId, "act-101");
    assert.equal(receipt.idempotencyKey, "idem-key-101");
    assert.equal(receipt.correlationId, "trace-101");
    assert.equal(receipt.operation, "create_issue");
    assert.equal(receipt.tool, "jira_mcp");
    assert.equal(receipt.actor, "usr-456");
    assert.equal(receipt.status, "SUCCESS");
    assert.equal(receipt.attemptNumber, 1);
    assert.equal(receipt.maxRetries, 3);
    assert.equal(receipt.createdAt, "2026-08-12T14:00:00.000Z");
    assert.equal(receipt.executedAt, "2026-08-12T14:00:01.000Z");
    assert.ok(Object.isFrozen(receipt));
  });
});

