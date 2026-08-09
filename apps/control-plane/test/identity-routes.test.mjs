import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "node:test";

import { registerIdentityRoutes } from "../dist/interfaces/http/identity/routes.js";

test("session route uses bearer token and never returns external subject", async () => {
  const calls = [];
  const app = Fastify({logger: false});
  registerIdentityRoutes(app, {
    establishSession: async (command) => {
      calls.push(command);
      return {sessionId: "10101010-1010-4010-8010-101010101010", tenantId: "22222222-2222-4222-8222-222222222222", userId: "55555555-5555-4555-8555-555555555555", deviceId: command.deviceId, clientVersion: command.clientVersion, authenticatedAt: "2026-08-08T12:00:00Z", expiresAt: "2026-08-08T20:00:00Z", identityProvider: "https://idp.example.test", externalSubject: "must-not-leak"};
    },
    revokeDevice: async () => ({version: 4}),
    authorizeAdministration: async () => ({tenantId: "22222222-2222-4222-8222-222222222222", userId: "55555555-5555-4555-8555-555555555555"}),
  });
  const response = await app.inject({method: "POST", url: "/v1/identity/sessions", headers: {authorization: "Bearer synthetic-token"}, payload: {deviceId: "20202020-2020-4020-8020-202020202020", clientVersion: "1.0.0"}});
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.includes("must-not-leak"), false);
  assert.equal(calls[0].token, "synthetic-token");
});

test("revocation ignores tenant and actor supplied by the client", async () => {
  let command;
  const app = Fastify({logger: false});
  registerIdentityRoutes(app, {
    establishSession: async () => { throw new Error("unused"); },
    revokeDevice: async (value) => { command = value; return {version: 4}; },
    authorizeAdministration: async () => ({tenantId: "22222222-2222-4222-8222-222222222222", userId: "55555555-5555-4555-8555-555555555555"}),
  });
  const response = await app.inject({method: "DELETE", url: "/v1/identity/devices/20202020-2020-4020-8020-202020202020", payload: {tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revokedBy: "attacker", reasonCode: "COMPROMISED"}});
  assert.equal(response.statusCode, 200);
  assert.equal(command.tenantId, "22222222-2222-4222-8222-222222222222");
  assert.equal(command.revokedBy, "55555555-5555-4555-8555-555555555555");
});
