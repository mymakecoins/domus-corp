import {randomUUID} from "node:crypto";

import type {FastifyInstance, FastifyRequest} from "fastify";

import type {ArchiveWorkspaceCommand, ChangeWorkspaceMembershipCommand, CreateWorkspaceCommand} from "../../../application/tenancy/manage-workspace.js";
import type {Workspace} from "../../../domain/tenancy/workspace.js";

type AdministrativeActor = Readonly<{
  tenantId: string; userId: string; deviceId: string; sessionId: string;
}>;

export type TenancyServices = Readonly<{
  createWorkspace(command: CreateWorkspaceCommand): Promise<Workspace>;
  archiveWorkspace(command: ArchiveWorkspaceCommand): Promise<{version: number}>;
  changeWorkspaceMembership(command: ChangeWorkspaceMembershipCommand): Promise<{version: number}>;
  authorizeAdministration(request: FastifyRequest): Promise<AdministrativeActor>;
}>;

function errorCode(error: unknown): "TENANT_ACCESS_DENIED" | "WORKSPACE_ACCESS_DENIED" | "IDENTITY_CLAIM_MISSING" | "IDENTITY_DEPENDENCY_UNAVAILABLE" {
  const message = String(error);
  if (message.includes("TENANT_ACCESS_DENIED")) return "TENANT_ACCESS_DENIED";
  if (message.includes("WORKSPACE_")) return "WORKSPACE_ACCESS_DENIED";
  if (message.includes("TENANCY_INVALID") || message.includes("IDENTITY_CLAIM_MISSING")) return "IDENTITY_CLAIM_MISSING";
  return "IDENTITY_DEPENDENCY_UNAVAILABLE";
}

function status(code: string): number {
  if (code === "IDENTITY_DEPENDENCY_UNAVAILABLE") return 503;
  if (code.endsWith("ACCESS_DENIED")) return 403;
  return 401;
}

export function registerTenancyRoutes(app: FastifyInstance, services: TenancyServices): void {
  app.post<{Body: Partial<Pick<CreateWorkspaceCommand, "workspaceId" | "ownerUserId" | "name" | "domainKey" | "policyId" | "defaultClassification">>}>(
    "/v1/admin/workspaces",
    async (request, reply) => {
      try {
        const body = request.body;
        if (!body?.workspaceId || !body.ownerUserId || !body.name || !body.domainKey || !body.policyId || !body.defaultClassification) {
          throw new Error("IDENTITY_CLAIM_MISSING");
        }
        const actor = await services.authorizeAdministration(request);
        const workspace = await services.createWorkspace({
          ...actor,
          workspaceId: body.workspaceId,
          ownerUserId: body.ownerUserId,
          name: body.name,
          domainKey: body.domainKey,
          policyId: body.policyId,
          defaultClassification: body.defaultClassification,
          requestId: randomUUID(),
          eventId: randomUUID(),
        });
        return reply.code(201).send(workspace);
      } catch (error) {
        const code = errorCode(error);
        return reply.code(status(code)).send({code});
      }
    },
  );

  app.delete<{Params: {workspaceId: string}}>("/v1/admin/workspaces/:workspaceId", async (request, reply) => {
    try {
      const actor = await services.authorizeAdministration(request);
      const result = await services.archiveWorkspace({...actor, workspaceId: request.params.workspaceId, requestId: randomUUID(), eventId: randomUUID()});
      return reply.send(result);
    } catch (error) {
      const code = errorCode(error);
      return reply.code(status(code)).send({code});
    }
  });

  app.put<{Params: {workspaceId: string; userId: string}; Body: Partial<Pick<ChangeWorkspaceMembershipCommand, "role" | "status" | "classificationClearance">>}>(
    "/v1/admin/workspaces/:workspaceId/members/:userId",
    async (request, reply) => {
      try {
        const body = request.body;
        if (!body?.role || !body.status || !body.classificationClearance) throw new Error("IDENTITY_CLAIM_MISSING");
        const actor = await services.authorizeAdministration(request);
        const result = await services.changeWorkspaceMembership({
          ...actor, workspaceId: request.params.workspaceId, memberUserId: request.params.userId,
          role: body.role, status: body.status, classificationClearance: body.classificationClearance,
          requestId: randomUUID(), eventId: randomUUID(),
        });
        return reply.send(result);
      } catch (error) {
        const code = errorCode(error);
        return reply.code(status(code)).send({code});
      }
    },
  );
}
