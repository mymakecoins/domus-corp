import assert from "node:assert/strict";
import { test } from "node:test";

import { revokeDeviceAccess } from "../dist/application/identity/revoke-device.js";

const command = {
  tenantId: "22222222-2222-4222-8222-222222222222",
  userId: "55555555-5555-4555-8555-555555555555",
  deviceId: "20202020-2020-4020-8020-202020202020",
  revokedBy: "55555555-5555-4555-8555-555555555555",
  reasonCode: "COMPROMISED",
  requestId: "11111111-1111-4111-8111-111111111111",
  eventId: "30303030-3030-4030-8030-303030303030",
};

test("persists revocation before publishing cache state", async () => {
  const order = [];
  const result = await revokeDeviceAccess({
    repository: {revoke: async () => { order.push("postgres"); return {version: 4}; }},
    cache: {publish: async (_id, state) => { order.push(`redis:${state.status}:${state.version}`); }},
    clock: {now: () => new Date("2026-08-08T12:00:00Z")},
  }, command);
  assert.deepEqual(order, ["postgres", "redis:REVOKED:4"]);
  assert.equal(result.version, 4);
});

test("reports fail-closed degradation if cache publication fails after durable revoke", async () => {
  let durable = false;
  await assert.rejects(revokeDeviceAccess({
    repository: {revoke: async () => { durable = true; return {version: 4}; }},
    cache: {publish: async () => { throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE"); }},
    clock: {now: () => new Date("2026-08-08T12:00:00Z")},
  }, command), /IDENTITY_DEPENDENCY_UNAVAILABLE/);
  assert.equal(durable, true);
});
