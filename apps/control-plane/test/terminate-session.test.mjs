import assert from "node:assert/strict";
import { test } from "node:test";

import { terminateSessionAccess } from "../dist/application/identity/terminate-session.js";

test("terminates the authenticated session with server-resolved ownership", async () => {
  let persisted;
  const result = await terminateSessionAccess({
    repository: {terminate: async (command) => { persisted = command; return {version: 2}; }},
    clock: {now: () => new Date("2026-08-08T13:00:00Z")},
  }, {
    tenantId: "22222222-2222-4222-8222-222222222222",
    userId: "55555555-5555-4555-8555-555555555555",
    sessionId: "10101010-1010-4010-8010-101010101010",
    requestId: "11111111-1111-4111-8111-111111111111",
    eventId: "30303030-3030-4030-8030-303030303030",
  });

  assert.equal(persisted.terminatedAt, "2026-08-08T13:00:00.000Z");
  assert.deepEqual(result, {version: 2});
});
