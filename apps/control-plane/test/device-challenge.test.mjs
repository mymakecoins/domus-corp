import assert from "node:assert/strict";
import { test } from "node:test";

import { issueDeviceChallenge } from "../dist/application/identity/issue-device-challenge.js";
import { createDeviceChallengeStore } from "../dist/infrastructure/redis/device-challenge-store.js";

test("issues a 256-bit challenge bound for 120 seconds", async () => {
  let saved;
  const result = await issueDeviceChallenge({
    randomBytes: () => Buffer.alloc(32, 7),
    clock: {now: () => new Date("2026-08-08T12:00:00Z")},
    store: {save: async (binding, ttlSeconds) => { saved = {binding, ttlSeconds}; }},
  }, {
    tenantId: "22222222-2222-4222-8222-222222222222",
    userId: "55555555-5555-4555-8555-555555555555",
    deviceId: "20202020-2020-4020-8020-202020202020",
    audience: "domus-device-registration",
  });
  assert.equal(Buffer.from(result.nonce, "base64url").length, 32);
  assert.equal(saved.ttlSeconds, 120);
  assert.equal(saved.binding.purpose, "device-registration");
  assert.equal(result.expiresAt, "2026-08-08T12:02:00.000Z");
});

test("challenge store uses NX/EX and fails closed on collision or dependency failure", async () => {
  const values = new Map();
  const store = createDeviceChallengeStore({
    set: async (key, value, options) => {
      assert.deepEqual(options, {NX: true, EX: 120});
      if (values.has(key)) return null;
      values.set(key, value);
      return "OK";
    },
    get: async (key) => values.get(key) ?? null,
    getDel: async (key) => { const value = values.get(key) ?? null; values.delete(key); return value; },
  });
  const state = {...binding, nonce: "nonce"};
  await store.save(state, 120);
  await assert.rejects(store.save(state, 120), /IDENTITY_DEPENDENCY_UNAVAILABLE/);
  assert.deepEqual(await store.peek("nonce"), state);
  assert.deepEqual(await store.consume("nonce"), state);
  assert.equal(await store.consume("nonce"), undefined);
});

const binding = {
  tenantId: "22222222-2222-4222-8222-222222222222",
  userId: "55555555-5555-4555-8555-555555555555",
  deviceId: "20202020-2020-4020-8020-202020202020",
  audience: "domus-device-registration",
  purpose: "device-registration",
  expiresAt: "2026-08-08T12:02:00.000Z",
};
