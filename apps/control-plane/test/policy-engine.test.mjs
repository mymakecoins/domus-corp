import assert from "node:assert/strict";
import {test} from "node:test";

import {composeEffectivePolicy} from "../dist/domain/policy/policy-engine.js";

const ids = {
  tenantId: "22222222-2222-4222-8222-222222222222", workspaceId: "33333333-3333-4333-8333-333333333333",
  userId: "55555555-5555-4555-8555-555555555555", deviceId: "20202020-2020-4020-8020-202020202020",
  requestId: "11111111-1111-4111-8111-111111111111",
};
const base = {
  allowedSources: ["source-a", "source-b"], allowedAssets: ["asset-a", "asset-b"],
  allowedModels: ["model-a", "model-b"], allowedTools: ["tool-a", "tool-b"],
  allowedActions: ["action-a", "action-b"], allowedClassifications: ["public", "internal", "confidential"],
  retentionMaxDays: 365, freshnessMaxAgeSeconds: 86400, insightsAllowed: true,
  budget: {currency: "BRL", limitMinor: 10000, remainingMinor: 8000},
};

function layer(scope, overrides = {}) {
  return {scope, policyId: `${scope}-policy`, version: 1, ...base, ...overrides};
}

test("composes global, tenant, workspace and role policies by intersection/minimum", () => {
  const effective = composeEffectivePolicy({
    ...ids,
    layers: [
      layer("global"),
      layer("tenant", {allowedModels: ["model-a"], budget: {currency: "BRL", limitMinor: 7000, remainingMinor: 6000}}),
      layer("workspace", {allowedSources: ["source-b"], retentionMaxDays: 180}),
      layer("role", {allowedTools: ["tool-b"], allowedClassifications: ["public", "internal"]}),
    ],
    evaluatedAt: "2026-08-08T12:00:00Z", expiresAt: "2026-08-08T12:05:00Z",
  });
  assert.equal(effective.decision, "ALLOW");
  assert.deepEqual(effective.allowedModels, ["model-a"]);
  assert.deepEqual(effective.allowedSources, ["source-b"]);
  assert.deepEqual(effective.allowedTools, ["tool-b"]);
  assert.equal(effective.retentionRules.maxDays, 180);
  assert.equal(effective.budgetScope.limitMinor, 7000);
  assert.equal(effective.provenance.length, 4);
});

test("a narrower layer can never reopen a globally denied item", () => {
  for (let index = 0; index < 50; index += 1) {
    const globalModels = index % 2 === 0 ? ["model-a"] : [];
    const effective = composeEffectivePolicy({...ids, layers: [
      layer("global", {allowedModels: globalModels}), layer("tenant"), layer("workspace"), layer("role"),
    ], evaluatedAt: "2026-08-08T12:00:00Z", expiresAt: "2026-08-08T12:05:00Z"});
    assert.equal(effective.allowedModels.includes("model-b"), false);
  }
});

test("fails closed on missing, duplicate, conflicted or invalid layers", () => {
  const input = {...ids, evaluatedAt: "2026-08-08T12:00:00Z", expiresAt: "2026-08-08T12:05:00Z"};
  assert.equal(composeEffectivePolicy({...input, layers: [layer("global"), layer("tenant"), layer("workspace")]}).decision, "DENY");
  assert.match(composeEffectivePolicy({...input, layers: [layer("global"), layer("tenant"), layer("workspace"), layer("role"), layer("role")]}).denyReasons.join(","), /POLICY_CONFLICT/);
  assert.equal(composeEffectivePolicy({...input, layers: [layer("global"), layer("tenant", {budget: {currency: "USD", limitMinor: 1, remainingMinor: 1}}), layer("workspace"), layer("role")]}).decision, "DENY");
});
