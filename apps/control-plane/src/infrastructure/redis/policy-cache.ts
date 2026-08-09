import type {PolicySecurityContext} from "../../application/policy/resolve-effective-policy.js";
import type {EffectivePolicy} from "../../domain/policy/policy-engine.js";

type Client = Readonly<{
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: {EX: number}): Promise<unknown>;
}>;

function key(context: Pick<PolicySecurityContext, "tenantId" | "workspaceId" | "userId" | "deviceId">): string {
  return `domus:policy:${context.tenantId}:${context.workspaceId}:${context.userId}:${context.deviceId}`;
}

function decode(encoded: string): EffectivePolicy {
  const value = JSON.parse(encoded) as Partial<EffectivePolicy>;
  if (typeof value.policyVersion !== "string" || typeof value.tenantId !== "string" ||
      typeof value.workspaceId !== "string" || typeof value.userId !== "string" ||
      typeof value.deviceId !== "string" || !Array.isArray(value.allowedSources) ||
      !Array.isArray(value.allowedModels) || !Array.isArray(value.denyReasons) ||
      !Array.isArray(value.provenance) || !["ALLOW", "DENY"].includes(String(value.decision)) ||
      typeof value.expiresAt !== "string") throw new Error("invalid policy cache");
  return value as EffectivePolicy;
}

export function createPolicyCache(client: Client) {
  return Object.freeze({
    async get(context: PolicySecurityContext, expectedVersion: string): Promise<EffectivePolicy | undefined> {
      try {
        const encoded = await client.get(key(context));
        if (encoded === null) return undefined;
        const policy = decode(encoded);
        return policy.policyVersion === expectedVersion ? policy : undefined;
      } catch {
        throw new Error("POLICY_DEPENDENCY_UNAVAILABLE");
      }
    },
    async publish(policy: EffectivePolicy): Promise<void> {
      try {
        await client.set(key(policy), JSON.stringify(policy), {EX: 300});
      } catch {
        throw new Error("POLICY_DEPENDENCY_UNAVAILABLE");
      }
    },
  });
}
