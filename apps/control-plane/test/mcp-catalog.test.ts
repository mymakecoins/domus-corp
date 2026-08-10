import assert from "node:assert/strict";
import { test } from "node:test";

import { ManageMcpCatalogService, createManageMcpCatalogService } from "../dist/application/mcp/manage-mcp-catalog.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const ownerUserId = "33333333-3333-4333-8333-333333333333";

test("registers MCP server with strict fail-closed security defaults (enabled: false, status: PENDING_SECURITY_APPROVAL)", async () => {
  const service = new ManageMcpCatalogService(() => "2026-08-10T12:00:00.000Z");

  const entry = await service.registerServer({
    tenantId,
    name: "GitHub Integration MCP",
    description: "Model Context Protocol server for GitHub repository access",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/github",
    tools: [
      {
        toolId: "github-read-issue",
        name: "Read Issue",
        description: "Fetch GitHub issue details",
        riskLevel: "low",
        parametersSchema: { type: "object" }
      }
    ],
    allowedWorkspaces: [workspaceId]
  });

  assert.ok(entry.serverId);
  assert.equal(entry.tenantId, tenantId);
  assert.equal(entry.name, "GitHub Integration MCP");
  // CRITICAL SECURITY ASSERTIONS: Fail-closed defaults
  assert.equal(entry.enabled, false);
  assert.equal(entry.status, "PENDING_SECURITY_APPROVAL");
  assert.equal(entry.createdAt, "2026-08-10T12:00:00.000Z");
  assert.equal(entry.updatedAt, "2026-08-10T12:00:00.000Z");
  assert.equal(entry.tools.length, 1);
  assert.equal(entry.allowedWorkspaces[0], workspaceId);
});

test("fails registration when mandatory fields are missing or invalid", async () => {
  const service = createManageMcpCatalogService();

  await assert.rejects(
    service.registerServer({
      tenantId: "",
      name: "Invalid",
      description: "Test",
      ownerUserId,
      endpointUrl: "https://example.com",
      tools: [],
      allowedWorkspaces: []
    }),
    /MCP_INVALID/
  );

  await assert.rejects(
    service.registerServer({
      tenantId,
      name: "   ",
      description: "Test",
      ownerUserId,
      endpointUrl: "https://example.com",
      tools: [],
      allowedWorkspaces: []
    }),
    /MCP_INVALID/
  );
});

test("retrieves server by tenant and server ID, throwing MCP_NOT_FOUND if invalid", async () => {
  const service = new ManageMcpCatalogService();
  const entry = await service.registerServer({
    tenantId,
    name: "Slack MCP",
    description: "Slack integration",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/slack",
    tools: [],
    allowedWorkspaces: []
  });

  const found = await service.getServer(tenantId, entry.serverId);
  assert.equal(found.serverId, entry.serverId);

  await assert.rejects(
    service.getServer(tenantId, "00000000-0000-4000-8000-000000000000"),
    /MCP_NOT_FOUND/
  );

  await assert.rejects(
    service.getServer("99999999-9999-4999-8999-999999999999", entry.serverId),
    /MCP_NOT_FOUND/
  );
});

test("lists servers filtered by tenant and workspace", async () => {
  const service = new ManageMcpCatalogService();

  const serverGlobal = await service.registerServer({
    tenantId,
    name: "Global MCP",
    description: "Global server",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/global",
    tools: [],
    allowedWorkspaces: [] // Allowed for all workspaces
  });

  const serverScoped = await service.registerServer({
    tenantId,
    name: "Scoped MCP",
    description: "Scoped server",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/scoped",
    tools: [],
    allowedWorkspaces: [workspaceId]
  });

  await service.registerServer({
    tenantId: "88888888-8888-4888-8888-888888888888",
    name: "Other Tenant MCP",
    description: "Other tenant server",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/other",
    tools: [],
    allowedWorkspaces: []
  });

  const tenantList = await service.listServers(tenantId);
  assert.equal(tenantList.length, 2);
  assert.ok(tenantList.some(s => s.serverId === serverGlobal.serverId));
  assert.ok(tenantList.some(s => s.serverId === serverScoped.serverId));

  const workspaceList = await service.listServers(tenantId, workspaceId);
  assert.equal(workspaceList.length, 2);

  const unknownWsList = await service.listServers(tenantId, "99999999-9999-4999-8999-999999999999");
  assert.equal(unknownWsList.length, 1);
  assert.equal(unknownWsList[0].serverId, serverGlobal.serverId);
});

test("approves server, transitioning status to APPROVED and enabled: true", async () => {
  let currentTime = "2026-08-10T12:00:00.000Z";
  const service = new ManageMcpCatalogService(() => currentTime);

  const entry = await service.registerServer({
    tenantId,
    name: "DB Proxy MCP",
    description: "Database proxy",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/db",
    tools: [],
    allowedWorkspaces: []
  });

  assert.equal(entry.status, "PENDING_SECURITY_APPROVAL");
  assert.equal(entry.enabled, false);

  currentTime = "2026-08-10T14:30:00.000Z";
  const approved = await service.approveServer(tenantId, entry.serverId);

  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.enabled, true);
  assert.equal(approved.updatedAt, "2026-08-10T14:30:00.000Z");
});

test("revokes server, transitioning status to REVOKED and enabled: false", async () => {
  let currentTime = "2026-08-10T12:00:00.000Z";
  const service = new ManageMcpCatalogService(() => currentTime);

  const entry = await service.registerServer({
    tenantId,
    name: "Legacy Tool MCP",
    description: "Legacy tool",
    ownerUserId,
    endpointUrl: "https://mcp.internal.domus/legacy",
    tools: [],
    allowedWorkspaces: []
  });

  await service.approveServer(tenantId, entry.serverId);

  currentTime = "2026-08-10T16:00:00.000Z";
  const revoked = await service.revokeServer(tenantId, entry.serverId, "Deprecation of legacy integration");

  assert.equal(revoked.status, "REVOKED");
  assert.equal(revoked.enabled, false);
  assert.equal(revoked.updatedAt, "2026-08-10T16:00:00.000Z");
});
