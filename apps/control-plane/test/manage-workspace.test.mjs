import assert from "node:assert/strict";
import { test } from "node:test";

import {archiveWorkspace, changeWorkspaceMembership, createWorkspaceAccess} from "../dist/application/tenancy/manage-workspace.js";

const actor = {tenantId: "22222222-2222-4222-8222-222222222222", userId: "55555555-5555-4555-8555-555555555555", deviceId: "20202020-2020-4020-8020-202020202020", sessionId: "10101010-1010-4010-8010-101010101010"};
const workspaceId = "33333333-3333-4333-8333-333333333333";

test("creates workspace and owner membership atomically for a tenant admin", async () => {
  let saved;
  const workspace = await createWorkspaceAccess({
    tenantRoles: {find: async () => ({...actor, role: "admin", status: "ACTIVE"})},
    users: {assertActive: async () => undefined},
    repository: {create: async (value) => { saved = value; }},
    clock: {now: () => new Date("2026-08-08T12:00:00Z")},
  }, {
    ...actor, workspaceId, ownerUserId: actor.userId, name: "Financeiro", domainKey: "finance",
    policyId: "44444444-4444-4444-8444-444444444444", defaultClassification: "confidential",
    requestId: "11111111-1111-4111-8111-111111111111", eventId: "30303030-3030-4030-8030-303030303030",
  });
  assert.equal(workspace.status, "ACTIVE");
  assert.equal(saved.ownerMembership.role, "owner");
  assert.equal(saved.ownerMembership.classificationClearance, "restricted");
  assert.equal(saved.occurredAt, "2026-08-08T12:00:00.000Z");
});

test("denies workspace creation before persistence when actor is not tenant admin", async () => {
  let persisted = false;
  await assert.rejects(createWorkspaceAccess({
    tenantRoles: {find: async () => ({...actor, role: "member", status: "ACTIVE"})},
    users: {assertActive: async () => undefined},
    repository: {create: async () => { persisted = true; }},
    clock: {now: () => new Date()},
  }, {...actor, workspaceId, ownerUserId: actor.userId, name: "Financeiro", domainKey: "finance", policyId: "44444444-4444-4444-8444-444444444444", defaultClassification: "internal", requestId: "11111111-1111-4111-8111-111111111111", eventId: "30303030-3030-4030-8030-303030303030"}), /TENANT_ACCESS_DENIED/);
  assert.equal(persisted, false);
});

test("archives a workspace through tenant admin authority", async () => {
  let command;
  const result = await archiveWorkspace({
    tenantRoles: {find: async () => ({...actor, role: "admin", status: "ACTIVE"})},
    repository: {archive: async (value) => { command = value; return {version: 2}; }},
    clock: {now: () => new Date("2026-08-08T13:00:00Z")},
  }, {...actor, workspaceId, requestId: "11111111-1111-4111-8111-111111111111", eventId: "30303030-3030-4030-8030-303030303030"});
  assert.equal(command.archivedAt, "2026-08-08T13:00:00.000Z");
  assert.deepEqual(result, {version: 2});
});

test("changes workspace membership through tenant admin authority", async () => {
  let command;
  const result = await changeWorkspaceMembership({
    tenantRoles: {find: async () => ({...actor, role: "admin", status: "ACTIVE"})},
    users: {assertActive: async () => undefined},
    repository: {changeMembership: async (value) => { command = value; return {version: 3}; }},
    clock: {now: () => new Date("2026-08-08T14:00:00Z")},
  }, {...actor, workspaceId, memberUserId: "66666666-6666-4666-8666-666666666666", role: "manager", status: "ACTIVE", classificationClearance: "confidential", requestId: "11111111-1111-4111-8111-111111111111", eventId: "30303030-3030-4030-8030-303030303030"});
  assert.equal(command.changedAt, "2026-08-08T14:00:00.000Z");
  assert.equal(command.role, "manager");
  assert.deepEqual(result, {version: 3});
});
