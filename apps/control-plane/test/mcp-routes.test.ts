import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";

import { buildApp } from "../dist/app.js";
import { ManageMcpCatalogService } from "../dist/application/mcp/manage-mcp-catalog.js";
import { McpProxyService } from "../dist/application/mcp/mcp-proxy-service.js";
import { registerMcpRoutes, type McpRouteServices } from "../dist/interfaces/http/mcp/routes.js";

const actor = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
  role: "admin"
};

function createServices(overrides: Partial<McpRouteServices> = {}): McpRouteServices {
  const catalog = new ManageMcpCatalogService(() => "2026-08-10T12:00:00.000Z");
  return {
    authorize: async () => actor,
    catalog,
    ...overrides
  };
}

test("POST /v1/admin/mcp/servers registers server with fail-closed defaults (enabled: false, PENDING_SECURITY_APPROVAL)", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/admin/mcp/servers",
    headers: { "x-request-id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    payload: {
      name: "GitHub MCP Server",
      description: "GitHub integration for repo management",
      endpoint_url: "https://mcp.internal.domus/github",
      tools: [
        {
          tool_id: "github-read-issue",
          name: "Read Issue",
          description: "Read issue details",
          risk_level: "low",
          parameters_schema: { type: "object" }
        }
      ],
      allowed_workspaces: [actor.workspaceId]
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.schema_version, "1.0.0");
  assert.equal(body.request_id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(body.tenant_id, actor.tenantId);
  assert.equal(body.workspace_id, actor.workspaceId);
  assert.equal(body.name, "GitHub MCP Server");

  // CRITICAL SECURITY DEFAULT ASSERTIONS
  assert.equal(body.enabled, false);
  assert.equal(body.status, "PENDING_SECURITY_APPROVAL");

  assert.equal(body.tools.length, 1);
  assert.equal(body.tools[0].tool_id, "github-read-issue");
  assert.equal(body.tools[0].risk_level, "low");
});

test("POST /v1/admin/mcp/servers rejects client authority tampering (tenant_id, status, enabled in payload)", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/admin/mcp/servers",
    payload: {
      name: "Malicious MCP",
      description: "Trying to bypass approval",
      endpoint_url: "https://mcp.internal.domus/malicious",
      tenant_id: "99999999-9999-4999-8999-999999999999",
      enabled: true,
      status: "APPROVED"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), { code: "MCP_INVALID" });
});

test("GET /v1/admin/mcp/servers lists registered servers for tenant/workspace", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  await services.catalog.registerServer({
    tenantId: actor.tenantId,
    name: "Server 1",
    description: "First server",
    ownerUserId: actor.userId,
    endpointUrl: "https://mcp.internal.domus/s1",
    tools: [],
    allowedWorkspaces: []
  });

  await services.catalog.registerServer({
    tenantId: actor.tenantId,
    name: "Server 2",
    description: "Second server",
    ownerUserId: actor.userId,
    endpointUrl: "https://mcp.internal.domus/s2",
    tools: [],
    allowedWorkspaces: [actor.workspaceId]
  });

  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/mcp/servers"
  });

  assert.equal(response.statusCode, 200);
  const list = response.json();
  assert.equal(Array.isArray(list), true);
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "Server 1");
  assert.equal(list[1].name, "Server 2");
});

test("GET /v1/admin/mcp/servers/:serverId retrieves server details and returns 404 for unknown server", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  const entry = await services.catalog.registerServer({
    tenantId: actor.tenantId,
    name: "Slack MCP",
    description: "Slack integration",
    ownerUserId: actor.userId,
    endpointUrl: "https://mcp.internal.domus/slack",
    tools: [],
    allowedWorkspaces: []
  });

  const successResponse = await app.inject({
    method: "GET",
    url: `/v1/admin/mcp/servers/${entry.serverId}`
  });

  assert.equal(successResponse.statusCode, 200);
  const body = successResponse.json();
  assert.equal(body.server_id, entry.serverId);
  assert.equal(body.name, "Slack MCP");

  const notFoundResponse = await app.inject({
    method: "GET",
    url: "/v1/admin/mcp/servers/00000000-0000-4000-8000-000000000000"
  });

  assert.equal(notFoundResponse.statusCode, 404);
  assert.deepEqual(notFoundResponse.json(), { code: "MCP_NOT_FOUND" });
});

test("POST /v1/admin/mcp/servers/:serverId/approve approves server (enabled: true, status: APPROVED)", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  const entry = await services.catalog.registerServer({
    tenantId: actor.tenantId,
    name: "DB Proxy MCP",
    description: "Database proxy",
    ownerUserId: actor.userId,
    endpointUrl: "https://mcp.internal.domus/db",
    tools: [],
    allowedWorkspaces: []
  });

  const response = await app.inject({
    method: "POST",
    url: `/v1/admin/mcp/servers/${entry.serverId}/approve`
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.enabled, true);
  assert.equal(body.status, "APPROVED");
});

test("POST /v1/admin/mcp/servers/:serverId/revoke revokes server (enabled: false, status: REVOKED)", async () => {
  const services = createServices();
  const app = Fastify();
  registerMcpRoutes(app, services);

  const entry = await services.catalog.registerServer({
    tenantId: actor.tenantId,
    name: "Legacy MCP",
    description: "Legacy server",
    ownerUserId: actor.userId,
    endpointUrl: "https://mcp.internal.domus/legacy",
    tools: [],
    allowedWorkspaces: []
  });

  await services.catalog.approveServer(actor.tenantId, entry.serverId);

  const response = await app.inject({
    method: "POST",
    url: `/v1/admin/mcp/servers/${entry.serverId}/revoke`,
    payload: { reason: "Deprecation" }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.enabled, false);
  assert.equal(body.status, "REVOKED");
});

test("authorization outage fails closed with typed 503 error", async () => {
  const services = createServices({
    authorize: async () => {
      throw new Error("MCP_DEPENDENCY_UNAVAILABLE");
    }
  });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/mcp/servers"
  });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), { code: "MCP_DEPENDENCY_UNAVAILABLE" });
});

test("buildApp registers MCP routes properly when mcpServices is provided", async () => {
  const services = createServices();
  const app = buildApp(undefined, undefined, undefined, undefined, services);

  const response = await app.inject({
    method: "GET",
    url: "/v1/admin/mcp/servers"
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), []);
});

test("POST /v1/mcp/tools/execute executes tool and redacts OAuth token in response", async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: "done", secret: "ya29.secret-access-token" })
  });

  const proxyService = new McpProxyService({
    getServer: async () => ({
      serverId: "44444444-4444-4444-8444-444444444444",
      tenantId: actor.tenantId,
      name: "Test Server",
      description: "Test",
      ownerUserId: actor.userId,
      endpointUrl: "https://mcp.internal/test",
      tools: [{ toolId: "t1", name: "T1", description: "Tool 1", riskLevel: "low", parametersSchema: {} }],
      enabled: true,
      status: "APPROVED",
      allowedWorkspaces: [actor.workspaceId],
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z"
    }),
    getEffectivePolicy: async () => ({
      tenantId: actor.tenantId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      deviceId: "d1",
      requestId: "r1",
      policyVersion: "v1",
      allowedSources: [], allowedAssets: [], allowedModels: [],
      allowedTools: ["t1"], allowedActions: [], allowedClassifications: [],
      retentionRules: {}, freshnessRules: {}, insightRules: { allowed: true },
      budgetScope: { scopeId: actor.workspaceId, currency: "USD", limitMinor: 100, remainingMinor: 100 },
      decision: "ALLOW", denyReasons: [], provenance: [], evaluatedAt: "2026-08-10T12:00:00.000Z", expiresAt: "2026-08-10T13:00:00.000Z"
    }),
    getScopedToken: async () => ({
      tokenId: "tok-1",
      tenantId: actor.tenantId,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      providerKey: "test server",
      accessToken: "ya29.secret-access-token",
      scopes: ["read"],
      expiresAt: "2099-01-01T00:00:00.000Z",
      status: "ACTIVE"
    }),
    fetchImpl: mockFetch as any
  });

  const services = createServices({ proxyService });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/mcp/tools/execute",
    payload: {
      server_id: "44444444-4444-4444-8444-444444444444",
      tool_id: "t1",
      parameters: { arg: "val" }
    }
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "SUCCESS");
  assert.equal(body.result.secret, "[REDACTED_OAUTH_TOKEN]");
});

test("POST /v1/mcp/tools/execute fails closed with 403 Forbidden for MCP_SERVER_NOT_APPROVED", async () => {
  const proxyService = new McpProxyService({
    getServer: async () => ({
      serverId: "44444444-4444-4444-8444-444444444444",
      tenantId: actor.tenantId,
      name: "Unapproved Server",
      description: "Test",
      ownerUserId: actor.userId,
      endpointUrl: "https://mcp.internal/test",
      tools: [{ toolId: "t1", name: "T1", description: "Tool 1", riskLevel: "low", parametersSchema: {} }],
      enabled: false,
      status: "PENDING_SECURITY_APPROVAL",
      allowedWorkspaces: [actor.workspaceId],
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z"
    }),
    getEffectivePolicy: async () => ({} as any),
    getScopedToken: async () => ({} as any)
  });

  const services = createServices({ proxyService });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/mcp/tools/execute",
    payload: {
      server_id: "44444444-4444-4444-8444-444444444444",
      tool_id: "t1"
    }
  });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), { code: "MCP_SERVER_NOT_APPROVED" });
});

test("POST /v1/mcp/tools/execute fails closed with 403 Forbidden for CREDENTIAL_REVOKED", async () => {
  const proxyService = new McpProxyService({
    getServer: async () => ({
      serverId: "44444444-4444-4444-8444-444444444444",
      tenantId: actor.tenantId,
      name: "Server",
      description: "Test",
      ownerUserId: actor.userId,
      endpointUrl: "https://mcp.internal/test",
      tools: [{ toolId: "t1", name: "T1", description: "Tool 1", riskLevel: "low", parametersSchema: {} }],
      enabled: true,
      status: "APPROVED",
      allowedWorkspaces: [actor.workspaceId],
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z"
    }),
    getEffectivePolicy: async () => ({
      tenantId: actor.tenantId, workspaceId: actor.workspaceId, userId: actor.userId,
      deviceId: "d1", requestId: "r1", policyVersion: "v1",
      allowedSources: [], allowedAssets: [], allowedModels: [],
      allowedTools: ["t1"], allowedActions: [], allowedClassifications: [],
      retentionRules: {}, freshnessRules: {}, insightRules: { allowed: true },
      budgetScope: { scopeId: actor.workspaceId, currency: "USD", limitMinor: 100, remainingMinor: 100 },
      decision: "ALLOW", denyReasons: [], provenance: [], evaluatedAt: "2026-08-10T12:00:00.000Z", expiresAt: "2026-08-10T13:00:00.000Z"
    }),
    getScopedToken: async () => ({
      tokenId: "tok-1", tenantId: actor.tenantId, workspaceId: actor.workspaceId, userId: actor.userId,
      providerKey: "server", accessToken: "ya29.secret-access-token", scopes: ["read"],
      expiresAt: "2099-01-01T00:00:00.000Z", status: "REVOKED"
    })
  });

  const services = createServices({ proxyService });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/mcp/tools/execute",
    payload: {
      server_id: "44444444-4444-4444-8444-444444444444",
      tool_id: "t1"
    }
  });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), { code: "CREDENTIAL_REVOKED" });
});

test("POST /v1/mcp/tools/execute fails with 404 Not Found for unknown server", async () => {
  const proxyService = new McpProxyService({
    getServer: async () => null,
    getEffectivePolicy: async () => ({} as any),
    getScopedToken: async () => ({} as any)
  });

  const services = createServices({ proxyService });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/mcp/tools/execute",
    payload: {
      server_id: "00000000-0000-4000-8000-000000000000",
      tool_id: "t1"
    }
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), { code: "MCP_SERVER_NOT_FOUND" });
});

test("POST /v1/mcp/tools/execute handles upstream timeout with 504 Gateway Timeout", async () => {
  const mockFetch = async () => {
    throw new Error("MCP_UPSTREAM_ERROR:504");
  };

  const proxyService = new McpProxyService({
    getServer: async () => ({
      serverId: "44444444-4444-4444-8444-444444444444", tenantId: actor.tenantId, name: "S1", description: "D", ownerUserId: actor.userId,
      endpointUrl: "https://mcp.internal/t", tools: [{ toolId: "t1", name: "T1", description: "D", riskLevel: "low", parametersSchema: {} }],
      enabled: true, status: "APPROVED", allowedWorkspaces: [actor.workspaceId], createdAt: "2026-08-10T12:00:00.000Z", updatedAt: "2026-08-10T12:00:00.000Z"
    }),
    getEffectivePolicy: async () => ({
      tenantId: actor.tenantId, workspaceId: actor.workspaceId, userId: actor.userId, deviceId: "d1", requestId: "r1", policyVersion: "v1",
      allowedSources: [], allowedAssets: [], allowedModels: [], allowedTools: ["t1"], allowedActions: [], allowedClassifications: [],
      retentionRules: {}, freshnessRules: {}, insightRules: { allowed: true }, budgetScope: { scopeId: actor.workspaceId, currency: "USD", limitMinor: 100, remainingMinor: 100 },
      decision: "ALLOW", denyReasons: [], provenance: [], evaluatedAt: "2026-08-10T12:00:00.000Z", expiresAt: "2026-08-10T13:00:00.000Z"
    }),
    getScopedToken: async () => ({
      tokenId: "tok-1", tenantId: actor.tenantId, workspaceId: actor.workspaceId, userId: actor.userId, providerKey: "s1",
      accessToken: "ya29.secret-access-token", scopes: [], expiresAt: "2099-01-01T00:00:00.000Z", status: "ACTIVE"
    }),
    fetchImpl: mockFetch as any
  });

  const services = createServices({ proxyService });
  const app = Fastify();
  registerMcpRoutes(app, services);

  const response = await app.inject({
    method: "POST",
    url: "/v1/mcp/tools/execute",
    payload: {
      server_id: "44444444-4444-4444-8444-444444444444",
      tool_id: "t1"
    }
  });

  assert.equal(response.statusCode, 504);
  assert.deepEqual(response.json(), { code: "MCP_GATEWAY_TIMEOUT" });
});
