import {composeEffectivePolicy, type EffectivePolicy, type PolicyLayer} from "../../domain/policy/policy-engine.js";

export type PolicySecurityContext = Readonly<{
  tenantId: string; workspaceId: string; userId: string; deviceId: string;
  sessionId: string; requestId: string;
}>;

type Dependencies = Readonly<{
  security: {assertCurrent(context: PolicySecurityContext): Promise<void>};
  policies: {loadPublished(context: PolicySecurityContext): Promise<readonly PolicyLayer[]>};
  cache: {
    get(context: PolicySecurityContext, expectedVersion: string): Promise<EffectivePolicy | undefined>;
    publish(policy: EffectivePolicy): Promise<void>;
  };
  audit: {record(event: Readonly<{
    requestId: string; tenantId: string; workspaceId: string; userId: string;
    deviceId: string; policyVersion: string; decision: "ALLOW" | "DENY"; denyReasons: readonly string[];
  }>): Promise<void>};
  clock: {now(): Date};
}>;

function cacheMatches(policy: EffectivePolicy, context: PolicySecurityContext, expectedVersion: string, now: Date): boolean {
  return policy.policyVersion === expectedVersion && policy.tenantId === context.tenantId &&
    policy.workspaceId === context.workspaceId && policy.userId === context.userId &&
    policy.deviceId === context.deviceId && Date.parse(policy.expiresAt) > now.getTime();
}

export async function resolveEffectivePolicy(
  dependencies: Dependencies,
  context: PolicySecurityContext,
): Promise<EffectivePolicy> {
  try {
    await dependencies.security.assertCurrent(context);
    const layers = await dependencies.policies.loadPublished(context);
    const evaluatedAt = dependencies.clock.now();
    const computed = composeEffectivePolicy({
      ...context,
      layers,
      evaluatedAt: evaluatedAt.toISOString(),
      expiresAt: new Date(evaluatedAt.getTime() + 5 * 60 * 1000).toISOString(),
    });
    const cached = await dependencies.cache.get(context, computed.policyVersion);
    const effective = cached && cacheMatches(cached, context, computed.policyVersion, evaluatedAt) ? cached : computed;
    await dependencies.audit.record({
      requestId: context.requestId, tenantId: context.tenantId, workspaceId: context.workspaceId,
      userId: context.userId, deviceId: context.deviceId, policyVersion: effective.policyVersion,
      decision: effective.decision, denyReasons: effective.denyReasons,
    });
    if (!cached || effective === computed) await dependencies.cache.publish(effective);
    if (effective.decision === "DENY") throw new Error("POLICY_DENIED");
    return effective;
  } catch (error) {
    if (String(error).includes("POLICY_DENIED") || String(error).includes("DEVICE_REVOKED")) {
      throw new Error("POLICY_DENIED");
    }
    throw new Error("POLICY_DEPENDENCY_UNAVAILABLE");
  }
}
