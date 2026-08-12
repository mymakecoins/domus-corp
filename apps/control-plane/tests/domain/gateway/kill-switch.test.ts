import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KillSwitchGuard } from "../../../src/domain/gateway/kill-switch.js";

describe("KillSwitchGuard", () => {
  it("blocks actions when global or workspace kill switch is enabled", () => {
    const guard = new KillSwitchGuard();
    assert.equal(guard.isKilled("t-1", "w-1"), false);

    guard.activateGlobal();
    assert.equal(guard.isKilled("t-1", "w-1"), true);

    guard.deactivateGlobal();
    assert.equal(guard.isKilled("t-1", "w-1"), false);

    guard.activateWorkspace("t-1", "w-1");
    assert.equal(guard.isKilled("t-1", "w-1"), true);
    assert.equal(guard.isKilled("t-1", "w-2"), false);

    guard.deactivateWorkspace("t-1", "w-1");
    assert.equal(guard.isKilled("t-1", "w-1"), false);
  });
});
