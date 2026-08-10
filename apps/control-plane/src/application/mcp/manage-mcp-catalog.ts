import { randomUUID } from "node:crypto";
import type {
  McpServerEntry,
  McpServerStatus,
  McpToolDefinition
} from "../../domain/mcp/mcp-catalog.js";

export type RegisterMcpServerInput = Readonly<{
  serverId?: string;
  tenantId: string;
  name: string;
  description: string;
  ownerUserId: string;
  endpointUrl: string;
  tools: readonly McpToolDefinition[];
  allowedWorkspaces: readonly string[];
}>;

export class ManageMcpCatalogService {
  private readonly servers = new Map<string, McpServerEntry>();

  constructor(private readonly clock: () => string = () => new Date().toISOString()) {}

  async registerServer(input: RegisterMcpServerInput): Promise<McpServerEntry> {
    if (
      !input.tenantId ||
      typeof input.tenantId !== "string" ||
      !input.name ||
      typeof input.name !== "string" ||
      input.name.trim().length === 0 ||
      typeof input.description !== "string" ||
      !input.ownerUserId ||
      typeof input.ownerUserId !== "string" ||
      !input.endpointUrl ||
      typeof input.endpointUrl !== "string"
    ) {
      throw new Error("MCP_INVALID");
    }

    const serverId = input.serverId || randomUUID();
    const now = this.clock();

    const entry: McpServerEntry = Object.freeze({
      serverId,
      tenantId: input.tenantId,
      name: input.name.trim(),
      description: input.description,
      ownerUserId: input.ownerUserId,
      endpointUrl: input.endpointUrl,
      tools: Object.freeze([...(input.tools || [])]),
      // Strict Fail-Closed Security Default
      enabled: false,
      status: "PENDING_SECURITY_APPROVAL",
      allowedWorkspaces: Object.freeze([...(input.allowedWorkspaces || [])]),
      createdAt: now,
      updatedAt: now
    });

    this.servers.set(serverId, entry);
    return entry;
  }

  async listServers(tenantId: string, workspaceId?: string): Promise<readonly McpServerEntry[]> {
    if (!tenantId) {
      throw new Error("MCP_INVALID");
    }

    const tenantServers = Array.from(this.servers.values()).filter(
      (server) => server.tenantId === tenantId
    );

    if (!workspaceId) {
      return Object.freeze(tenantServers);
    }

    const filtered = tenantServers.filter(
      (server) =>
        server.allowedWorkspaces.length === 0 ||
        server.allowedWorkspaces.includes(workspaceId)
    );

    return Object.freeze(filtered);
  }

  async getServer(tenantIdOrServerId: string, serverIdArg?: string): Promise<McpServerEntry> {
    const serverId = serverIdArg ?? tenantIdOrServerId;
    const tenantId = serverIdArg ? tenantIdOrServerId : undefined;

    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error("MCP_NOT_FOUND");
    }

    if (tenantId && server.tenantId !== tenantId) {
      throw new Error("MCP_NOT_FOUND");
    }

    return server;
  }

  async approveServer(tenantIdOrServerId: string, serverIdArg?: string): Promise<McpServerEntry> {
    const serverId = serverIdArg ?? tenantIdOrServerId;
    const tenantId = serverIdArg ? tenantIdOrServerId : undefined;

    const existing = await this.getServer(tenantId ?? serverId, serverIdArg ? serverId : undefined);

    const now = this.clock();
    const updated: McpServerEntry = Object.freeze({
      ...existing,
      enabled: true,
      status: "APPROVED",
      updatedAt: now
    });

    this.servers.set(serverId, updated);
    return updated;
  }

  async revokeServer(
    tenantIdOrServerId: string,
    serverIdOrReason?: string,
    reasonArg?: string
  ): Promise<McpServerEntry> {
    let tenantId: string | undefined;
    let serverId: string;

    if (reasonArg !== undefined || (serverIdOrReason && this.servers.has(serverIdOrReason))) {
      tenantId = tenantIdOrServerId;
      serverId = serverIdOrReason!;
    } else if (this.servers.has(tenantIdOrServerId)) {
      serverId = tenantIdOrServerId;
    } else {
      tenantId = tenantIdOrServerId;
      serverId = serverIdOrReason || "";
    }

    const existing = await this.getServer(tenantId ?? serverId, tenantId ? serverId : undefined);

    const now = this.clock();
    const updated: McpServerEntry = Object.freeze({
      ...existing,
      enabled: false,
      status: "REVOKED",
      updatedAt: now
    });

    this.servers.set(serverId, updated);
    return updated;
  }
}

export function createManageMcpCatalogService(clock?: () => string): ManageMcpCatalogService {
  return new ManageMcpCatalogService(clock);
}
