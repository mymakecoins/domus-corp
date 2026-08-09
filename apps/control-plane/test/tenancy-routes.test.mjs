import assert from "node:assert/strict";
import Fastify from "fastify";
import {test} from "node:test";

import {registerTenancyRoutes} from "../dist/interfaces/http/tenancy/routes.js";

const actor = {tenantId: "22222222-2222-4222-8222-222222222222", userId: "55555555-5555-4555-8555-555555555555", deviceId: "20202020-2020-4020-8020-202020202020", sessionId: "10101010-1010-4010-8010-101010101010"};

test("admin workspace route ignores client tenant and actor authority", async () => {
  let command;
  const app = Fastify({logger: false});
  registerTenancyRoutes(app, {
    authorizeAdministration: async () => actor,
    createWorkspace: async (value) => { command = value; return {...value, status: "ACTIVE", version: 1}; },
    archiveWorkspace: async () => ({version: 2}),
    changeWorkspaceMembership: async () => ({version: 2}),
  });
  const response = await app.inject({method: "POST", url: "/v1/admin/workspaces", payload: {
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: "attacker",
    workspaceId: "33333333-3333-4333-8333-333333333333", ownerUserId: actor.userId,
    name: "Financeiro", domainKey: "finance", policyId: "44444444-4444-4444-8444-444444444444",
    defaultClassification: "confidential",
  }});
  assert.equal(response.statusCode, 201);
  assert.equal(command.tenantId, actor.tenantId);
  assert.equal(command.userId, actor.userId);
});

test("admin workspace route fails closed when authorization is unavailable", async () => {
  const app = Fastify({logger: false});
  registerTenancyRoutes(app, {
    authorizeAdministration: async () => { throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE"); },
    createWorkspace: async () => { throw new Error("unused"); },
    archiveWorkspace: async () => ({version: 2}),
    changeWorkspaceMembership: async () => ({version: 2}),
  });
  const response = await app.inject({method: "DELETE", url: "/v1/admin/workspaces/33333333-3333-4333-8333-333333333333"});
  assert.equal(response.statusCode, 503);
});
