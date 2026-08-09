import assert from "node:assert/strict";
import { test } from "node:test";

import { createPostgresIdentityAdapters } from "../dist/infrastructure/postgres/identity-repositories.js";
import { createRevocationCache } from "../dist/infrastructure/redis/revocation-cache.js";

const ids = {
  session: "10101010-1010-4010-8010-101010101010",
  event: "30303030-3030-4030-8030-303030303030",
  request: "11111111-1111-4111-8111-111111111111",
  user: "55555555-5555-4555-8555-555555555555",
  tenant: "22222222-2222-4222-8222-222222222222",
  device: "20202020-2020-4020-8020-202020202020",
};

test("PostgreSQL session save sets local context and writes session plus outbox atomically", async () => {
  const calls = [];
  const client = {
    query: async (text, values = []) => {
      calls.push({text, values});
      return {rows: [], rowCount: 1};
    },
    release: () => calls.push({text: "RELEASE", values: []}),
  };
  const adapters = createPostgresIdentityAdapters({connect: async () => client, query: client.query});
  await adapters.sessionRepository.save({
    sessionId: ids.session, userId: ids.user, tenantId: ids.tenant, deviceId: ids.device,
    clientVersion: "1.0.0", authenticatedAt: "2026-08-08T12:00:00Z",
    expiresAt: "2026-08-08T20:00:00Z", identityProvider: "https://idp.example.test",
    externalSubject: "synthetic-user",
  }, {requestId: ids.request, eventId: ids.event});

  assert.equal(calls[0].text, "BEGIN");
  assert.match(calls[1].text, /set_config\('app.current_tenant_id'/);
  assert.match(calls[2].text, /insert into iam_auth_session/i);
  assert.match(calls[3].text, /insert into iam_outbox_event/i);
  assert.equal(calls[4].text, "COMMIT");
  assert.equal(calls.at(-1).text, "RELEASE");
});

test("PostgreSQL transaction rolls back and always releases on failure", async () => {
  const calls = [];
  const client = {
    query: async (text) => {
      calls.push(text);
      if (/insert into iam_auth_session/i.test(text)) throw new Error("synthetic database failure");
      return {rows: [], rowCount: 1};
    },
    release: () => calls.push("RELEASE"),
  };
  const adapters = createPostgresIdentityAdapters({connect: async () => client, query: client.query});
  await assert.rejects(adapters.sessionRepository.save({
    sessionId: ids.session, userId: ids.user, tenantId: ids.tenant, deviceId: ids.device,
    clientVersion: "1.0.0", authenticatedAt: "2026-08-08T12:00:00Z",
    expiresAt: "2026-08-08T20:00:00Z", identityProvider: "https://idp.example.test",
    externalSubject: "synthetic-user",
  }, {requestId: ids.request, eventId: ids.event}), /synthetic database failure/);
  assert.deepEqual(calls.slice(-2), ["ROLLBACK", "RELEASE"]);
});

test("revocation cache fails closed on missing, malformed, stale, or unavailable state", async () => {
  const values = new Map([[`domus:device:${ids.device}`, JSON.stringify({status: "ACTIVE", version: 3})]]);
  const cache = createRevocationCache({
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => { values.set(key, value); return "OK"; },
  });
  await cache.assertActive(ids.device, 3);
  await assert.rejects(cache.assertActive(ids.device, 4), /IDENTITY_DEPENDENCY_UNAVAILABLE/);
  values.set(`domus:device:${ids.device}`, "bad-json");
  await assert.rejects(cache.assertActive(ids.device, 3), /IDENTITY_DEPENDENCY_UNAVAILABLE/);
  values.set(`domus:device:${ids.device}`, JSON.stringify({status: "REVOKED", version: 4}));
  await assert.rejects(cache.assertActive(ids.device, 4), /DEVICE_REVOKED/);
});
