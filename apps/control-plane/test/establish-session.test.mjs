import assert from "node:assert/strict";
import { test } from "node:test";

import { establishSession } from "../dist/application/identity/establish-session.js";

const ids = {
  session: "10101010-1010-4010-8010-101010101010",
  user: "55555555-5555-4555-8555-555555555555",
  tenant: "22222222-2222-4222-8222-222222222222",
  otherTenant: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  device: "20202020-2020-4020-8020-202020202020",
};

function dependencies(overrides = {}) {
  const saved = [];
  return {
    saved,
    oidcProvider: {verify: async () => ({
      issuer: "https://idp.example.test",
      subject: "synthetic-user",
      audiences: Object.freeze(["domus-control-plane"]),
      issuedAt: "2026-08-08T12:00:00Z",
      expiresAt: "2026-08-08T12:10:00Z",
      externalGroups: Object.freeze([]),
      externalTenantHints: Object.freeze([]),
      claimsHash: `sha256:${"a".repeat(64)}`,
    })},
    identityRepository: {resolve: async () => ({memberships: [{userId: ids.user, tenantId: ids.tenant}]})},
    deviceRepository: {find: async () => ({
      deviceId: ids.device, tenantId: ids.tenant, userId: ids.user,
      publicKeyThumbprint: `sha256:${"b".repeat(64)}`, status: "ACTIVE", version: 2,
      registeredAt: "2026-08-08T11:00:00Z", activatedAt: "2026-08-08T11:01:00Z",
    })},
    sessionRepository: {save: async (session) => saved.push(session)},
    clock: {now: () => new Date("2026-08-08T12:00:00Z")},
    ids: {next: () => ids.session},
    ...overrides,
  };
}

test("establishes a session from server-resolved identity and active device", async () => {
  const deps = dependencies();
  const session = await establishSession(deps, {
    token: "synthetic-token-never-logged",
    requestId: "11111111-1111-4111-8111-111111111111",
    deviceId: ids.device,
    clientVersion: "1.0.0",
  });

  assert.equal(session.tenantId, ids.tenant);
  assert.equal(deps.saved.length, 1);
  assert.equal("allowedSources" in session, false);
});

test("requires explicit eligible tenant when identity belongs to many", async () => {
  const deps = dependencies({
    identityRepository: {resolve: async () => ({memberships: [
      {userId: ids.user, tenantId: ids.tenant},
      {userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", tenantId: ids.otherTenant},
    ]})},
  });
  await assert.rejects(
    establishSession(deps, {token: "synthetic", requestId: "11111111-1111-4111-8111-111111111111", deviceId: ids.device, clientVersion: "1.0.0"}),
    /TENANT_SELECTION_REQUIRED/,
  );
});

test("selecting a tenant also selects its tenant-bound user", async () => {
  const otherUser = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const deps = dependencies({
    identityRepository: {resolve: async () => ({memberships: [
      {userId: ids.user, tenantId: ids.tenant},
      {userId: otherUser, tenantId: ids.otherTenant},
    ]})},
    deviceRepository: {find: async () => ({
      deviceId: ids.device, tenantId: ids.otherTenant, userId: otherUser,
      publicKeyThumbprint: `sha256:${"b".repeat(64)}`, status: "ACTIVE", version: 2,
      registeredAt: "2026-08-08T11:00:00Z", activatedAt: "2026-08-08T11:01:00Z",
    })},
  });

  const session = await establishSession(deps, {
    token: "synthetic", requestId: "11111111-1111-4111-8111-111111111111", deviceId: ids.device, clientVersion: "1.0.0",
    requestedTenantId: ids.otherTenant,
  });
  assert.equal(session.userId, otherUser);
  assert.equal(session.tenantId, ids.otherTenant);
});

test("rejects a revoked device before persisting the session", async () => {
  const deps = dependencies({
    deviceRepository: {find: async () => ({
      deviceId: ids.device, tenantId: ids.tenant, userId: ids.user,
      publicKeyThumbprint: `sha256:${"b".repeat(64)}`, status: "REVOKED", version: 3,
      registeredAt: "2026-08-08T11:00:00Z", revokedAt: "2026-08-08T11:30:00Z",
      revokedBy: ids.user, reasonCode: "COMPROMISED",
    })},
  });
  await assert.rejects(
    establishSession(deps, {token: "synthetic", requestId: "11111111-1111-4111-8111-111111111111", deviceId: ids.device, clientVersion: "1.0.0"}),
    /DEVICE_REVOKED/,
  );
  assert.equal(deps.saved.length, 0);
});
