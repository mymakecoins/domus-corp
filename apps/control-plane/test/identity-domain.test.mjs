import assert from "node:assert/strict";
import { test } from "node:test";

import { createAuthenticatedSession } from "../dist/domain/identity/authenticated-session.js";
import { activateDevice, registerDevice, revokeDevice } from "../dist/domain/identity/device.js";
import { createExternalIdentity } from "../dist/domain/identity/external-identity.js";
import { createRequestSecurityContext } from "../dist/domain/identity/request-security-context.js";

const ids = {
  session: "10101010-1010-4010-8010-101010101010",
  user: "55555555-5555-4555-8555-555555555555",
  tenant: "22222222-2222-4222-8222-222222222222",
  device: "20202020-2020-4020-8020-202020202020",
  workspace: "33333333-3333-4333-8333-333333333333",
  request: "11111111-1111-4111-8111-111111111111",
};

test("external identity is immutable and carries no effective authorization", () => {
  const identity = createExternalIdentity({
    issuer: "https://idp.example.test",
    subject: "synthetic-user",
    audiences: ["domus-control-plane"],
    issuedAt: "2026-08-08T12:00:00Z",
    expiresAt: "2026-08-08T12:10:00Z",
    externalGroups: ["finance-readers"],
    claimsHash: `sha256:${"a".repeat(64)}`,
  });

  assert(Object.isFrozen(identity));
  assert(Object.isFrozen(identity.audiences));
  assert.equal("allowedSources" in identity, false);
  assert.throws(() => identity.audiences.push("forged"), TypeError);
});

test("session is bound to one tenant and rejects policy authority", () => {
  const session = createAuthenticatedSession({
    sessionId: ids.session,
    userId: ids.user,
    tenantId: ids.tenant,
    deviceId: ids.device,
    clientVersion: "1.0.0",
    authenticatedAt: "2026-08-08T12:00:00Z",
    expiresAt: "2026-08-08T20:00:00Z",
    identityProvider: "https://idp.example.test",
    externalSubject: "synthetic-user",
  });

  assert(Object.isFrozen(session));
  assert.equal(session.tenantId, ids.tenant);
  assert.throws(
    () => createAuthenticatedSession({...session, allowedSources: []}),
    /unsupported identity field: allowedSources/,
  );
});

test("request context requires a server-resolved workspace", () => {
  assert.throws(
    () => createRequestSecurityContext({
      requestId: ids.request,
      traceId: "0123456789abcdef0123456789abcdef",
      sessionId: ids.session,
      userId: ids.user,
      tenantId: ids.tenant,
      deviceId: ids.device,
      clientVersion: "1.0.0",
      authenticatedAt: "2026-08-08T12:00:00Z",
    }),
    /workspaceId is required/,
  );
});

test("device lifecycle is monotonic and revoked devices cannot reactivate", () => {
  const pending = registerDevice({
    deviceId: ids.device,
    tenantId: ids.tenant,
    userId: ids.user,
    publicKeyThumbprint: `sha256:${"b".repeat(43)}`,
    registeredAt: "2026-08-08T12:00:00Z",
  });
  const active = activateDevice(pending, "2026-08-08T12:01:00Z");
  const revoked = revokeDevice(active, {
    revokedAt: "2026-08-08T12:02:00Z",
    revokedBy: ids.user,
    reasonCode: "REINSTALLED",
  });

  assert.equal(pending.status, "PENDING");
  assert.equal(active.status, "ACTIVE");
  assert.equal(revoked.status, "REVOKED");
  assert.equal(revoked.version, 3);
  assert.throws(() => activateDevice(revoked, "2026-08-08T12:03:00Z"), /DEVICE_REVOKED/);
});
