import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assertTenantAdministrator,
  authorizeWorkspaceRead,
  restrictWorkspaceClassification,
} from "../dist/domain/tenancy/workspace-authorization.js";

const tenantId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "33333333-3333-4333-8333-333333333333";
const userId = "55555555-5555-4555-8555-555555555555";

test("tenant administration requires a server-resolved active admin role", () => {
  assert.doesNotThrow(() => assertTenantAdministrator({tenantId, userId, role: "admin", status: "ACTIVE"}, tenantId));
  assert.throws(() => assertTenantAdministrator({tenantId, userId, role: "member", status: "ACTIVE"}, tenantId), /TENANT_ACCESS_DENIED/);
  assert.throws(() => assertTenantAdministrator({tenantId, userId, role: "admin", status: "SUSPENDED"}, tenantId), /TENANT_ACCESS_DENIED/);
  assert.throws(() => assertTenantAdministrator({tenantId, userId, role: "admin", status: "ACTIVE"}, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), /TENANT_ACCESS_DENIED/);
});

test("workspace read requires matching scope, active membership and classification clearance", () => {
  const membership = {tenantId, workspaceId, userId, role: "member", status: "ACTIVE", classificationClearance: "confidential"};
  assert.doesNotThrow(() => authorizeWorkspaceRead(membership, {tenantId, workspaceId, classification: "internal"}));
  assert.throws(() => authorizeWorkspaceRead(membership, {tenantId, workspaceId, classification: "restricted"}), /WORKSPACE_ACCESS_DENIED/);
  assert.throws(() => authorizeWorkspaceRead({...membership, workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}, {tenantId, workspaceId, classification: "internal"}), /WORKSPACE_ACCESS_DENIED/);
});

test("manager can only move workspace defaults toward stricter classification", () => {
  assert.equal(restrictWorkspaceClassification("manager", "internal", "confidential"), "confidential");
  assert.throws(() => restrictWorkspaceClassification("manager", "confidential", "internal"), /WORKSPACE_SCOPE_EXPANSION_DENIED/);
  assert.throws(() => restrictWorkspaceClassification("member", "internal", "confidential"), /WORKSPACE_ACCESS_DENIED/);
  assert.equal(restrictWorkspaceClassification("owner", "confidential", "internal"), "internal");
});
