import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ManageMcpCatalogService } from "../../../application/mcp/manage-mcp-catalog.js";
import type { McpServerEntry, McpRiskLevel } from "../../../domain/mcp/mcp-catalog.js";

export type McpActor = Readonly<{
  tenantId: string;
  workspaceId?: string;
  userId: string;
  role?: string;
}>;

export type McpRouteServices = Readonly<{
  authorize(request: FastifyRequest): Promise<McpActor>;
  catalog: ManageMcpCatalogService;
}>;

const authorityKeys = new Set(["tenantId", "tenant_id", "status", "enabled"]);

function requestId(request: FastifyRequest): string {
  const supplied = request.headers["x-request-id"];
  return typeof supplied === "string" && /^[0-9a-f-]{36}$/i.test(supplied)
    ? supplied
    : randomUUID();
}

function safeBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("MCP_INVALID");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => authorityKeys.has(key))) {
    throw new Error("MCP_INVALID");
  }
  return body;
}

export function presentMcpServer(
  entry: McpServerEntry,
  reqId: string,
  actorWorkspaceId?: string
) {
  const workspaceId =
    actorWorkspaceId ||
    (entry.allowedWorkspaces.length > 0
      ? entry.allowedWorkspaces[0]
      : "00000000-0000-4000-8000-000000000000");

  return {
    schema_version: "1.0.0",
    request_id: reqId,
    tenant_id: entry.tenantId,
    workspace_id: workspaceId,
    policy_version: "policy-v1",
    classification: "internal",
    provenance: {
      source_id: entry.serverId,
      source_version: "1",
      observed_at: entry.updatedAt,
      producer: "mcp-ts"
    },
    server_id: entry.serverId,
    name: entry.name,
    description: entry.description,
    owner_user_id: entry.ownerUserId,
    endpoint_url: entry.endpointUrl,
    tools: entry.tools.map((t) => ({
      tool_id: t.toolId,
      name: t.name,
      description: t.description,
      risk_level: t.riskLevel,
      parameters_schema: t.parametersSchema
    })),
    enabled: entry.enabled,
    status: entry.status,
    allowed_workspaces: entry.allowedWorkspaces,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt
  };
}

export function mapping(error: unknown): { code: string; status: number } {
  const message = String(error instanceof Error ? error.message : error);
  if (message.includes("DEPENDENCY_UNAVAILABLE")) {
    return { code: "MCP_DEPENDENCY_UNAVAILABLE", status: 503 };
  }
  if (message.includes("NOT_FOUND")) {
    return { code: "MCP_NOT_FOUND", status: 404 };
  }
  if (message.includes("ACCESS_DENIED") || message.includes("UNAUTHORIZED")) {
    return { code: "MCP_ACCESS_DENIED", status: 403 };
  }
  if (
    message.includes("INVALID") ||
    message.includes("PRECONDITION") ||
    message.includes("CLIENT_AUTHORITY")
  ) {
    return { code: "MCP_INVALID", status: 400 };
  }
  return { code: "MCP_DEPENDENCY_UNAVAILABLE", status: 503 };
}

async function handled(
  reply: FastifyReply,
  operation: () => Promise<unknown>,
  created = false
) {
  try {
    const result = await operation();
    return reply.code(created ? 201 : 200).send(result);
  } catch (error) {
    const mapped = mapping(error);
    return reply.code(mapped.status).send({ code: mapped.code });
  }
}

export function registerMcpRoutes(
  app: FastifyInstance,
  services: McpRouteServices
): void {
  const getCatalog = (s: McpRouteServices) => s.catalog ?? (s as any);

  app.post("/v1/admin/mcp/servers", async (request, reply) =>
    handled(
      reply,
      async () => {
        const reqId = requestId(request);
        const body = safeBody(request.body);
        const actor = await services.authorize(request);
        const catalog = getCatalog(services);

        const toolsInput = Array.isArray(body.tools)
          ? body.tools.map((t: any) => ({
              toolId: String(t.tool_id ?? t.toolId ?? ""),
              name: String(t.name ?? ""),
              description: String(t.description ?? ""),
              riskLevel: (t.risk_level ?? t.riskLevel ?? "low") as McpRiskLevel,
              parametersSchema: (t.parameters_schema ?? t.parametersSchema ?? {}) as Record<string, unknown>
            }))
          : [];

        const allowedWorkspaces = Array.isArray(body.allowed_workspaces)
          ? body.allowed_workspaces.map(String)
          : Array.isArray(body.allowedWorkspaces)
          ? body.allowedWorkspaces.map(String)
          : [];

        const serverId = body.server_id ?? body.serverId;

        const entry = await catalog.registerServer({
          ...(typeof serverId === "string" ? { serverId } : {}),
          tenantId: actor.tenantId,
          name: String(body.name ?? ""),
          description: String(body.description ?? ""),
          ownerUserId: String(body.owner_user_id ?? body.ownerUserId ?? actor.userId),
          endpointUrl: String(body.endpoint_url ?? body.endpointUrl ?? ""),
          tools: toolsInput,
          allowedWorkspaces
        });

        return presentMcpServer(entry, reqId, actor.workspaceId);
      },
      true
    )
  );

  app.get("/v1/admin/mcp/servers", async (request, reply) =>
    handled(reply, async () => {
      const reqId = requestId(request);
      const actor = await services.authorize(request);
      const catalog = getCatalog(services);
      const query = (request.query ?? {}) as { workspaceId?: string; workspace_id?: string };
      const workspaceId = query.workspace_id ?? query.workspaceId ?? actor.workspaceId;

      const servers = await catalog.listServers(actor.tenantId, workspaceId);
      return servers.map((entry: McpServerEntry) =>
        presentMcpServer(entry, reqId, actor.workspaceId)
      );
    })
  );

  app.get<{ Params: { serverId: string } }>(
    "/v1/admin/mcp/servers/:serverId",
    async (request, reply) =>
      handled(reply, async () => {
        const reqId = requestId(request);
        const actor = await services.authorize(request);
        const catalog = getCatalog(services);
        const entry = await catalog.getServer(actor.tenantId, request.params.serverId);
        return presentMcpServer(entry, reqId, actor.workspaceId);
      })
  );

  app.post<{ Params: { serverId: string } }>(
    "/v1/admin/mcp/servers/:serverId/approve",
    async (request, reply) =>
      handled(reply, async () => {
        const reqId = requestId(request);
        const actor = await services.authorize(request);
        const catalog = getCatalog(services);
        const approved = await catalog.approveServer(actor.tenantId, request.params.serverId);
        return presentMcpServer(approved, reqId, actor.workspaceId);
      })
  );

  app.post<{ Params: { serverId: string } }>(
    "/v1/admin/mcp/servers/:serverId/revoke",
    async (request, reply) =>
      handled(reply, async () => {
        const reqId = requestId(request);
        const actor = await services.authorize(request);
        const catalog = getCatalog(services);
        const body = (request.body ?? {}) as Record<string, unknown>;
        const reason = typeof body.reason === "string" ? body.reason : undefined;
        const revoked = await catalog.revokeServer(actor.tenantId, request.params.serverId, reason);
        return presentMcpServer(revoked, reqId, actor.workspaceId);
      })
  );
}
