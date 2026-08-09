import type {Classification} from "../tenancy/workspace.js";

export type PolicyScope = "global" | "tenant" | "workspace" | "role";

export type PolicyLayer = Readonly<{
  scope: PolicyScope;
  policyId: string;
  version: number;
  allowedSources: readonly string[];
  allowedAssets: readonly string[];
  allowedModels: readonly string[];
  allowedTools: readonly string[];
  allowedActions: readonly string[];
  allowedClassifications: readonly Classification[];
  retentionMaxDays: number;
  freshnessMaxAgeSeconds: number;
  insightsAllowed: boolean;
  budget: Readonly<{currency: string; limitMinor: number; remainingMinor: number}>;
}>;

export type EffectivePolicy = Readonly<{
  tenantId: string; workspaceId: string; userId: string; deviceId: string; requestId: string;
  policyVersion: string;
  allowedSources: readonly string[]; allowedAssets: readonly string[];
  allowedModels: readonly string[]; allowedTools: readonly string[]; allowedActions: readonly string[];
  allowedClassifications: readonly Classification[];
  retentionRules: Readonly<{maxDays: number}>;
  freshnessRules: Readonly<{maxAgeSeconds: number}>;
  insightRules: Readonly<{allowed: boolean}>;
  budgetScope: Readonly<{scopeId: string; currency: string; limitMinor: number; remainingMinor: number}>;
  decision: "ALLOW" | "DENY";
  denyReasons: readonly string[];
  provenance: readonly Readonly<{scope: PolicyScope; policyId: string; version: number}>[];
  evaluatedAt: string; expiresAt: string;
}>;

const REQUIRED_SCOPES: readonly PolicyScope[] = ["global", "tenant", "workspace", "role"];

function intersection<T>(layers: readonly PolicyLayer[], select: (layer: PolicyLayer) => readonly T[]): T[] {
  const [first, ...remaining] = layers.map(select);
  if (!first) return [];
  return [...new Set(first)].filter((item) => remaining.every((values) => values.includes(item)));
}

export function composeEffectivePolicy(input: Readonly<{
  tenantId: string; workspaceId: string; userId: string; deviceId: string; requestId: string;
  layers: readonly PolicyLayer[]; evaluatedAt: string; expiresAt: string;
}>): EffectivePolicy {
  const counts = new Map<PolicyScope, number>();
  for (const layer of input.layers) counts.set(layer.scope, (counts.get(layer.scope) ?? 0) + 1);
  const missing = REQUIRED_SCOPES.filter((scope) => !counts.has(scope));
  const conflicts = REQUIRED_SCOPES.filter((scope) => (counts.get(scope) ?? 0) > 1);
  const ordered = REQUIRED_SCOPES.map((scope) => input.layers.find((layer) => layer.scope === scope)).filter((layer): layer is PolicyLayer => layer !== undefined);
  const currencies = new Set(ordered.map((layer) => layer.budget.currency));
  const invalid = ordered.some((layer) => layer.version < 1 || layer.retentionMaxDays < 0 ||
    layer.freshnessMaxAgeSeconds < 0 || layer.budget.limitMinor < 0 || layer.budget.remainingMinor < 0);
  const denyReasons = [
    ...missing.map((scope) => `POLICY_MISSING:${scope}`),
    ...conflicts.map((scope) => `POLICY_CONFLICT:${scope}`),
    ...(currencies.size > 1 ? ["POLICY_CONFLICT:budget_currency"] : []),
    ...(invalid ? ["POLICY_INVALID"] : []),
  ];
  const decision = denyReasons.length === 0 ? "ALLOW" : "DENY";
  const currency = currencies.size === 1 ? [...currencies][0] ?? "XXX" : "XXX";
  const minimum = (select: (layer: PolicyLayer) => number) => ordered.length ? Math.min(...ordered.map(select)) : 0;
  return Object.freeze({
    tenantId: input.tenantId, workspaceId: input.workspaceId, userId: input.userId,
    deviceId: input.deviceId, requestId: input.requestId,
    policyVersion: ordered.map((layer) => `${layer.scope}:${layer.policyId}:${layer.version}`).join("|"),
    allowedSources: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedSources) : [],
    allowedAssets: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedAssets) : [],
    allowedModels: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedModels) : [],
    allowedTools: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedTools) : [],
    allowedActions: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedActions) : [],
    allowedClassifications: decision === "ALLOW" ? intersection(ordered, (layer) => layer.allowedClassifications) : [],
    retentionRules: Object.freeze({maxDays: decision === "ALLOW" ? minimum((layer) => layer.retentionMaxDays) : 0}),
    freshnessRules: Object.freeze({maxAgeSeconds: decision === "ALLOW" ? minimum((layer) => layer.freshnessMaxAgeSeconds) : 0}),
    insightRules: Object.freeze({allowed: decision === "ALLOW" && ordered.every((layer) => layer.insightsAllowed)}),
    budgetScope: Object.freeze({scopeId: input.workspaceId, currency, limitMinor: decision === "ALLOW" ? minimum((layer) => layer.budget.limitMinor) : 0, remainingMinor: decision === "ALLOW" ? minimum((layer) => layer.budget.remainingMinor) : 0}),
    decision,
    denyReasons: Object.freeze(denyReasons),
    provenance: Object.freeze(ordered.map((layer) => Object.freeze({scope: layer.scope, policyId: layer.policyId, version: layer.version}))),
    evaluatedAt: input.evaluatedAt, expiresAt: input.expiresAt,
  });
}
