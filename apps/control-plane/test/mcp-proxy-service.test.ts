import assert from "node:assert/strict";
import { test } from "node:test";
import { McpProxyService } from "../dist/application/mcp/mcp-proxy-service.js";
import type { McpServerEntry } from "../dist/domain/mcp/mcp-catalog.js";
import type { EffectivePolicy } from "../dist/domain/policy/policy-engine.js";
import type { ScopedOAuthToken } from "../dist/domain/credentials/scoped-credential-vault.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const serverId = "44444444-4444-4444-8444-444444444444";

const mockApprovedServer: McpServerEntry = {
  serverId,
  tenantId,
  name: "Google Drive MCP",
  description: "Drive reader",
  ownerUserId: userId,
  endpointUrl: "https://mcp.internal/drive",
  tools: [
    {
      toolId: "drive_search",
      name: "Search Drive",
      description: "Find files",
      riskLevel: "low",
      parametersSchema: { type: "object" },
    },
  ],
  enabled: true,
  status: "APPROVED",
  allowedWorkspaces: [workspaceId],
  createdAt: "2026-08-10T12:00:00.000Z",
  updatedAt: "2026-08-10T12:00:00.000Z",
};

const mockEffectivePolicy: EffectivePolicy = {
  tenantId,
  workspaceId,
  userId,
  deviceId: "d1",
  requestId: "r1",
  policyVersion: "global:1|tenant:1",
  allowedSources: [],
  allowedAssets: [],
  allowedModels: [],
  allowedTools: ["drive_search"],
  allowedActions: [],
  allowedClassifications: ["internal"],
  retentionRules: { maxDays: 30 },
  freshnessRules: { maxAgeSeconds: 3600 },
  insightRules: { allowed: true },
  budgetScope: { scopeId: workspaceId, currency: "USD", limitMinor: 1000, remainingMinor: 1000 },
  decision: "ALLOW",
  denyReasons: [],
  provenance: [],
  evaluatedAt: "2026-08-10T12:00:00.000Z",
  expiresAt: "2026-08-10T13:00:00.000Z",
};

const mockActiveToken: ScopedOAuthToken = {
  tokenId: "tok-1",
  tenantId,
  workspaceId,
  userId,
  providerKey: "google drive mcp",
  accessToken: "ya29.secret-access-token",
  scopes: ["read:drive"],
  expiresAt: "2099-01-01T00:00:00.000Z",
  status: "ACTIVE",
};

test("executeTool forwards authorized request with OAuth token and redacts output", async () => {
  let dispatchedHeaders: Record<string, string> = {};
  const mockFetch = async (url: string, init: any) => {
    dispatchedHeaders = init.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        result: "Found document",
        echoToken: "ya29.secret-access-token",
      }),
    };
  };

  const service = new McpProxyService({
    getServer: async () => mockApprovedServer,
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
    fetchImpl: mockFetch as any,
  });

  const response = await service.executeTool({
    tenantId,
    workspaceId,
    userId,
    serverId,
    toolId: "drive_search",
    parameters: { query: "finance" },
    requiredScopes: ["read:drive"],
  });

  assert.equal(dispatchedHeaders["Authorization"], "Bearer ya29.secret-access-token");
  assert.ok((response.result as any).framedOutput.includes('<untrusted_content tool_id="drive_search" risk="LOW">'));
  assert.ok((response.result as any).framedOutput.includes('[REDACTED_OAUTH_TOKEN]'));
});

test("executeTool rejects unapproved server (PENDING_SECURITY_APPROVAL) with MCP_SERVER_NOT_APPROVED", async () => {
  const service = new McpProxyService({
    getServer: async () => ({ ...mockApprovedServer, status: "PENDING_SECURITY_APPROVAL", enabled: true }),
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_SERVER_NOT_APPROVED/
  );
});

test("executeTool rejects unapproved server (REVOKED) with MCP_SERVER_NOT_APPROVED", async () => {
  const service = new McpProxyService({
    getServer: async () => ({ ...mockApprovedServer, status: "REVOKED", enabled: true }),
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_SERVER_NOT_APPROVED/
  );
});

test("executeTool rejects disabled server with MCP_SERVER_NOT_APPROVED", async () => {
  const service = new McpProxyService({
    getServer: async () => ({ ...mockApprovedServer, enabled: false }),
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_SERVER_NOT_APPROVED/
  );
});

test("executeTool rejects workspace mismatch with MCP_WORKSPACE_FORBIDDEN", async () => {
  const service = new McpProxyService({
    getServer: async () => ({ ...mockApprovedServer, allowedWorkspaces: ["other-workspace-id"] }),
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_WORKSPACE_FORBIDDEN/
  );
});

test("executeTool rejects when policy denies tool with MCP_POLICY_DENIED", async () => {
  const service = new McpProxyService({
    getServer: async () => mockApprovedServer,
    getEffectivePolicy: async () => ({ ...mockEffectivePolicy, allowedTools: [] }),
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_POLICY_DENIED/
  );
});

test("executeTool rejects when policy decision is DENY with MCP_POLICY_DENIED", async () => {
  const service = new McpProxyService({
    getServer: async () => mockApprovedServer,
    getEffectivePolicy: async () => ({ ...mockEffectivePolicy, decision: "DENY" }),
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: [],
    }),
    /MCP_POLICY_DENIED/
  );
});

test("executeTool rejects revoked token immediately with CREDENTIAL_REVOKED", async () => {
  const service = new McpProxyService({
    getServer: async () => mockApprovedServer,
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => ({ ...mockActiveToken, status: "REVOKED" }),
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: {},
      requiredScopes: ["read:drive"],
    }),
    /CREDENTIAL_REVOKED/
  );
});

test("executeTool rejects path traversal attempt with MCP_PATH_FORBIDDEN", async () => {
  const service = new McpProxyService({
    getServer: async () => mockApprovedServer,
    getEffectivePolicy: async () => mockEffectivePolicy,
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "drive_search",
      parameters: { filePath: "../../etc/passwd" },
      allowedPrefixes: ["/workspace/docs"],
    }),
    /MCP_PATH_FORBIDDEN/
  );
});

test("executeTool rejects HIGH risk tool without confirmation with MCP_APPROVAL_REQUIRED", async () => {
  const highRiskServer: McpServerEntry = {
    ...mockApprovedServer,
    tools: [
      {
        toolId: "delete_file",
        name: "Delete File",
        description: "Delete file from drive",
        riskLevel: "HIGH" as any,
        parametersSchema: {},
      },
    ],
  };

  const service = new McpProxyService({
    getServer: async () => highRiskServer,
    getEffectivePolicy: async () => ({ ...mockEffectivePolicy, allowedTools: ["delete_file"] }),
    getScopedToken: async () => mockActiveToken,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "delete_file",
      parameters: {},
    }),
    /MCP_APPROVAL_REQUIRED/
  );
});

test("executeTool succeeds for HIGH risk tool when confirmation token is provided and frames output", async () => {
  const highRiskServer: McpServerEntry = {
    ...mockApprovedServer,
    tools: [
      {
        toolId: "delete_file",
        name: "Delete File",
        description: "Delete file from drive",
        riskLevel: "HIGH" as any,
        parametersSchema: {},
      },
    ],
  };

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ deleted: true }),
  });

  const service = new McpProxyService({
    getServer: async () => highRiskServer,
    getEffectivePolicy: async () => ({ ...mockEffectivePolicy, allowedTools: ["delete_file"] }),
    getScopedToken: async () => mockActiveToken,
    fetchImpl: mockFetch as any,
  });

  const response = await service.executeTool({
    tenantId,
    workspaceId,
    userId,
    serverId,
    toolId: "delete_file",
    parameters: {},
    confirmationToken: "token-123",
  });

  assert.equal(response.status, "SUCCESS");
  const result = response.result as any;
  assert.ok(result.framedOutput.includes('<untrusted_content tool_id="delete_file" risk="HIGH">'));
  assert.ok(result.framedOutput.includes('"deleted":true'));
});

test("executeTool handles timeout sandboxing and aborts when timeout is exceeded", async () => {
  const mockFetch = async (url: string, init: any) => {
    return new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  };

  const timeoutServer: McpServerEntry = {
    ...mockApprovedServer,
    tools: [
      {
        toolId: "slow_tool",
        name: "Slow Tool",
        description: "Takes long time",
        riskLevel: "low",
        timeoutMs: 10,
        parametersSchema: {},
      },
    ],
  };

  const service = new McpProxyService({
    getServer: async () => timeoutServer,
    getEffectivePolicy: async () => ({ ...mockEffectivePolicy, allowedTools: ["slow_tool"] }),
    getScopedToken: async () => mockActiveToken,
    fetchImpl: mockFetch as any,
  });

  await assert.rejects(
    service.executeTool({
      tenantId,
      workspaceId,
      userId,
      serverId,
      toolId: "slow_tool",
      parameters: {},
    }),
    /MCP_UPSTREAM_ERROR:504/
  );
});

