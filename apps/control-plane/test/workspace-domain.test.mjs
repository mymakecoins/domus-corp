import assert from "node:assert/strict";
import { test } from "node:test";

import {createWorkspace} from "../dist/domain/tenancy/workspace.js";

test("workspace is immutable and records owner, domain, policy reference and classification", () => {
  const workspace = createWorkspace({
    tenantId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    ownerUserId: "55555555-5555-4555-8555-555555555555",
    name: "Financeiro",
    domainKey: "finance",
    policyId: "44444444-4444-4444-8444-444444444444",
    defaultClassification: "confidential",
    status: "ACTIVE",
    version: 1,
  });
  assert.equal(Object.isFrozen(workspace), true);
  assert.equal(workspace.domainKey, "finance");
  assert.throws(() => createWorkspace({...workspace, domainKey: "Invalid Domain"}), /TENANCY_INVALID/);
  assert.throws(() => createWorkspace({...workspace, policyId: "client-policy"}), /TENANCY_INVALID/);
});
