export type Classification = "public" | "internal" | "confidential" | "restricted";

export type Workspace = Readonly<{
  tenantId: string;
  workspaceId: string;
  ownerUserId: string;
  name: string;
  domainKey: string;
  policyId: string;
  defaultClassification: Classification;
  status: "ACTIVE" | "ARCHIVED";
  version: number;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CLASSIFICATIONS = new Set<Classification>(["public", "internal", "confidential", "restricted"]);

export function createWorkspace(input: Workspace): Workspace {
  if (!UUID.test(input.tenantId) || !UUID.test(input.workspaceId) ||
      !UUID.test(input.ownerUserId) || !UUID.test(input.policyId) ||
      input.name.trim().length === 0 || input.name.length > 120 ||
      !DOMAIN_KEY.test(input.domainKey) || !CLASSIFICATIONS.has(input.defaultClassification) ||
      !["ACTIVE", "ARCHIVED"].includes(input.status) || !Number.isInteger(input.version) || input.version < 1) {
    throw new Error("TENANCY_INVALID");
  }
  return Object.freeze({...input});
}
