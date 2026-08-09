import {assertTenantAdministrator, type TenantRole} from "../../domain/tenancy/workspace-authorization.js";
import {createWorkspace, type Classification, type Workspace} from "../../domain/tenancy/workspace.js";

type Actor = Readonly<{tenantId: string; userId: string; deviceId: string; sessionId: string}>;
type Context = Readonly<{requestId: string; eventId: string}>;

export type CreateWorkspaceCommand = Actor & Context & Readonly<{
  workspaceId: string;
  ownerUserId: string;
  name: string;
  domainKey: string;
  policyId: string;
  defaultClassification: Classification;
}>;

export type ArchiveWorkspaceCommand = Actor & Context & Readonly<{workspaceId: string}>;
export type ChangeWorkspaceMembershipCommand = Actor & Context & Readonly<{
  workspaceId: string;
  memberUserId: string;
  role: "member" | "manager" | "owner" | "admin";
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  classificationClearance: Classification;
}>;

type RoleRepository = {find(tenantId: string, userId: string): Promise<TenantRole | undefined>};

export async function createWorkspaceAccess(
  dependencies: Readonly<{
    tenantRoles: RoleRepository;
    users: {assertActive(tenantId: string, userId: string): Promise<void>};
    repository: {create(input: Readonly<{
      workspace: Workspace;
      ownerMembership: Readonly<{
        tenantId: string; workspaceId: string; userId: string; role: "owner";
        status: "ACTIVE"; classificationClearance: "restricted";
      }>;
      actor: Readonly<{userId: string; deviceId: string; sessionId: string}>;
      requestId: string; eventId: string; occurredAt: string;
    }>): Promise<void>};
    clock: {now(): Date};
  }>,
  command: CreateWorkspaceCommand,
): Promise<Workspace> {
  const role = await dependencies.tenantRoles.find(command.tenantId, command.userId);
  if (!role) throw new Error("TENANT_ACCESS_DENIED");
  assertTenantAdministrator(role, command.tenantId);
  await dependencies.users.assertActive(command.tenantId, command.ownerUserId);
  const workspace = createWorkspace({
    tenantId: command.tenantId,
    workspaceId: command.workspaceId,
    ownerUserId: command.ownerUserId,
    name: command.name,
    domainKey: command.domainKey,
    policyId: command.policyId,
    defaultClassification: command.defaultClassification,
    status: "ACTIVE",
    version: 1,
  });
  await dependencies.repository.create({
    workspace,
    ownerMembership: {
      tenantId: workspace.tenantId, workspaceId: workspace.workspaceId, userId: workspace.ownerUserId,
      role: "owner", status: "ACTIVE", classificationClearance: "restricted",
    },
    actor: {userId: command.userId, deviceId: command.deviceId, sessionId: command.sessionId},
    requestId: command.requestId,
    eventId: command.eventId,
    occurredAt: dependencies.clock.now().toISOString(),
  });
  return workspace;
}

export async function archiveWorkspace(
  dependencies: Readonly<{
    tenantRoles: RoleRepository;
    repository: {archive(command: ArchiveWorkspaceCommand & {archivedAt: string}): Promise<{version: number}>};
    clock: {now(): Date};
  }>,
  command: ArchiveWorkspaceCommand,
): Promise<{version: number}> {
  const role = await dependencies.tenantRoles.find(command.tenantId, command.userId);
  if (!role) throw new Error("TENANT_ACCESS_DENIED");
  assertTenantAdministrator(role, command.tenantId);
  return dependencies.repository.archive({...command, archivedAt: dependencies.clock.now().toISOString()});
}

export async function changeWorkspaceMembership(
  dependencies: Readonly<{
    tenantRoles: RoleRepository;
    users: {assertActive(tenantId: string, userId: string): Promise<void>};
    repository: {changeMembership(command: ChangeWorkspaceMembershipCommand & {changedAt: string}): Promise<{version: number}>};
    clock: {now(): Date};
  }>,
  command: ChangeWorkspaceMembershipCommand,
): Promise<{version: number}> {
  const actorRole = await dependencies.tenantRoles.find(command.tenantId, command.userId);
  if (!actorRole) throw new Error("TENANT_ACCESS_DENIED");
  assertTenantAdministrator(actorRole, command.tenantId);
  await dependencies.users.assertActive(command.tenantId, command.memberUserId);
  return dependencies.repository.changeMembership({...command, changedAt: dependencies.clock.now().toISOString()});
}
