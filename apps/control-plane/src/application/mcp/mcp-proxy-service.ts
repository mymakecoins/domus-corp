import { McpServerEntry } from "../../domain/mcp/mcp-catalog.js";
import { EffectivePolicy } from "../../domain/policy/policy-engine.js";
import { ScopedOAuthToken, resolveScopedToken } from "../../domain/credentials/scoped-credential-vault.js";
import { redactObject, redactText } from "../../domain/security/token-redactor.js";

export type McpToolExecutionInput = Readonly<{
  tenantId: string;
  workspaceId: string;
  userId: string;
  serverId: string;
  toolId: string;
  parameters: Record<string, unknown>;
  requiredScopes?: readonly string[];
}>;

export type McpToolExecutionOutput = Readonly<{
  serverId: string;
  toolId: string;
  status: "SUCCESS" | "FAILED";
  result: unknown;
  executedAt: string;
}>;

export type McpProxyServiceDependencies = Readonly<{
  getServer: (tenantId: string, serverId: string) => Promise<McpServerEntry | null>;
  getEffectivePolicy: (tenantId: string, workspaceId: string, userId: string) => Promise<EffectivePolicy>;
  getScopedToken: (tenantId: string, workspaceId: string, userId: string, providerKey: string) => Promise<ScopedOAuthToken | null>;
  fetchImpl?: typeof fetch;
  now?: () => string;
}>;

export class McpProxyService {
  private readonly getServer: McpProxyServiceDependencies["getServer"];
  private readonly getEffectivePolicy: McpProxyServiceDependencies["getEffectivePolicy"];
  private readonly getScopedToken: McpProxyServiceDependencies["getScopedToken"];
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => string;

  constructor(deps: McpProxyServiceDependencies) {
    this.getServer = deps.getServer;
    this.getEffectivePolicy = deps.getEffectivePolicy;
    this.getScopedToken = deps.getScopedToken;
    this.fetchImpl = deps.fetchImpl ?? globalThis.fetch;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async executeTool(input: McpToolExecutionInput): Promise<McpToolExecutionOutput> {
    const server = await this.getServer(input.tenantId, input.serverId);
    if (!server) {
      throw new Error("MCP_SERVER_NOT_FOUND");
    }

    if (!server.enabled || server.status !== "APPROVED") {
      throw new Error("MCP_SERVER_NOT_APPROVED");
    }

    if (!server.allowedWorkspaces.includes(input.workspaceId)) {
      throw new Error("MCP_WORKSPACE_FORBIDDEN");
    }

    const toolDef = server.tools.find((t) => t.toolId === input.toolId);
    if (!toolDef) {
      throw new Error("MCP_TOOL_NOT_FOUND");
    }

    const policy = await this.getEffectivePolicy(input.tenantId, input.workspaceId, input.userId);
    if (policy.decision !== "ALLOW" || !policy.allowedTools.includes(input.toolId)) {
      throw new Error("MCP_POLICY_DENIED");
    }

    const token = await this.getScopedToken(input.tenantId, input.workspaceId, input.userId, server.name.toLowerCase());
    if (!token) {
      throw new Error("CREDENTIAL_NOT_FOUND");
    }

    const resolvedToken = resolveScopedToken(token, {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      requiredScopes: input.requiredScopes ?? [],
    });

    const endpoint = `${server.endpointUrl}/tools/${encodeURIComponent(input.toolId)}/execute`;

    try {
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedToken.accessToken}`,
        },
        body: JSON.stringify(input.parameters),
      });

      if (!response.ok) {
        throw new Error(`MCP_UPSTREAM_ERROR:${response.status}`);
      }

      const rawJson = await response.json();
      const redactedResult = redactObject(rawJson, [resolvedToken.accessToken]);

      return Object.freeze({
        serverId: input.serverId,
        toolId: input.toolId,
        status: "SUCCESS",
        result: redactedResult,
        executedAt: this.now(),
      });
    } catch (err: any) {
      if (err.message && err.message.startsWith("MCP_")) {
        throw err;
      }
      const safeMessage = redactText(err.message || "Execution failed", [resolvedToken.accessToken]);
      throw new Error(`MCP_EXECUTION_FAILED:${safeMessage}`);
    }
  }
}

export function createMcpProxyService(deps: McpProxyServiceDependencies): McpProxyService {
  return new McpProxyService(deps);
}
