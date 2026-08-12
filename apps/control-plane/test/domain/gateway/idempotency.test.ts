import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IdempotencyService, InMemoryIdempotencyStorage } from "../../../src/domain/gateway/idempotency.js";
import { createActionReceipt } from "../../../src/domain/gateway/action-request.js";

describe("IdempotencyService", () => {
  it("stores and retrieves receipts for idempotent execution", async () => {
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

    assert.equal(await service.getReceipt("key-1"), null);
    await service.saveReceipt("key-1", receipt);
    assert.deepEqual(await service.getReceipt("key-1"), receipt);
  });

  it("handles in-flight lock reservations and completed receipt checks", async () => {
    const storage = new InMemoryIdempotencyStorage();
    const service = new IdempotencyService(storage);

    const lock1 = await service.reserveInFlight("key-1");
    assert.equal(lock1, "ACQUIRED");

    const lock2 = await service.reserveInFlight("key-1");
    assert.equal(lock2, "IN_PROGRESS");

    const receipt = createActionReceipt({
      actionId: "act-1",
      idempotencyKey: "key-1",
      status: "SUCCESS",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "usr-1",
    });

    await service.saveReceipt("key-1", receipt);

    const saved = await service.getReceipt("key-1");
    assert.ok(saved);
    assert.equal(saved?.status, "SUCCESS");

    const lock3 = await service.reserveInFlight("key-1");
    assert.equal(lock3, "COMPLETED");
  });
});
