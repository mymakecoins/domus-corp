import type {Classification} from "./workspace.js";

export type TenantRole = Readonly<{
  tenantId: string;
  userId: string;
  role: "member" | "admin";
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
}>;

export type WorkspaceMembership = Readonly<{
  tenantId: string;
  workspaceId: string;
  userId: string;
  role: "member" | "manager" | "owner" | "admin";
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  classificationClearance: Classification;
}>;

const CLASSIFICATION_RANK: Readonly<Record<Classification, number>> = Object.freeze({
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
});

export function assertTenantAdministrator(actor: TenantRole, tenantId: string): void {
  if (actor.tenantId !== tenantId || actor.role !== "admin" || actor.status !== "ACTIVE") {
    throw new Error("TENANT_ACCESS_DENIED");
  }
}

export function authorizeWorkspaceRead(
  membership: WorkspaceMembership,
  resource: Readonly<{tenantId: string; workspaceId: string; classification: Classification}>,
): void {
  if (membership.status !== "ACTIVE" || membership.tenantId !== resource.tenantId ||
      membership.workspaceId !== resource.workspaceId ||
      CLASSIFICATION_RANK[resource.classification] > CLASSIFICATION_RANK[membership.classificationClearance]) {
    throw new Error("WORKSPACE_ACCESS_DENIED");
  }
}

export function restrictWorkspaceClassification(
  role: WorkspaceMembership["role"],
  current: Classification,
  requested: Classification,
): Classification {
  if (role === "member") throw new Error("WORKSPACE_ACCESS_DENIED");
  if (role === "manager" && CLASSIFICATION_RANK[requested] < CLASSIFICATION_RANK[current]) {
    throw new Error("WORKSPACE_SCOPE_EXPANSION_DENIED");
  }
  return requested;
}
