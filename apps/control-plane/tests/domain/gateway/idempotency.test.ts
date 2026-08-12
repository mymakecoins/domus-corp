import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IdempotencyService } from "../../../src/domain/gateway/idempotency.js";
import { createActionReceipt } from "../../../src/domain/gateway/action-request.js";

describe("IdempotencyService", () => {
  it("stores and retrieves receipts for idempotent execution", () => {
    const service = new IdempotencyService();
    const receipt = createActionReceipt({
      actionId: "act-1",
      idempotencyKey: "key-1",
      status: "SUCCESS",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      result: { ok: true },
    });

    assert.equal(service.getReceipt("key-1"), null);
    service.saveReceipt("key-1", receipt);
    assert.deepEqual(service.getReceipt("key-1"), receipt);
  });
});
