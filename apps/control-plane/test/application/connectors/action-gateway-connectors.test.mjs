import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../../dist/application/gateway/action-gateway-service.js";
import { ConnectorRegistryActionConnector } from "../../../dist/application/connectors/connector-registry.js";
import { GoogleDriveConnector } from "../../../dist/application/connectors/google-drive-connector.js";
import { GitHubConnector } from "../../../dist/application/connectors/github-connector.js";
import { MockCredentialResolver } from "../../../dist/infrastructure/credentials/credential-resolver.js";
import { InMemoryIdempotencyService } from "../../../dist/domain/gateway/idempotency.js";
import { KillSwitchGuard } from "../../../dist/domain/gateway/kill-switch.js";

test("ActionGatewayService executes Google Drive and GitHub actions through ConnectorRegistry", async () => {
  const credentialResolver = new MockCredentialResolver();
  const registry = new ConnectorRegistryActionConnector();

  const drive = new GoogleDriveConnector(credentialResolver, async () => {
    return new Response(JSON.stringify({ files: [{ id: "f1", name: "Doc" }] }), { status: 200 });
  });

  const github = new GitHubConnector(credentialResolver, async () => {
    return new Response(JSON.stringify({ id: 1, number: 10, title: "Issue 10" }), { status: 201 });
  });

  registry.register(drive);
  registry.register(github);

  const gateway = new ActionGatewayService({
    killSwitch: new KillSwitchGuard(),
    idempotency: new InMemoryIdempotencyService(),
    getPolicy: async () => ({ decision: "ALLOW" }),
    defaultConnector: registry,
  });

  const driveReceipt = await gateway.executeAction({
    actionId: "act-drive-1",
    tenantId: "t1",
    workspaceId: "w1",
    userId: "u1",
    target: "google-drive",
    actionType: "google_drive_search",
    idempotencyKey: "idem-d1",
    parameters: { query: "Doc" },
    riskLevel: "LOW"
  });

  assert.equal(driveReceipt.status, "SUCCESS");
  assert.equal(driveReceipt.tool, "google-drive");

  const githubReceipt = await gateway.executeAction({
    actionId: "act-gh-1",
    tenantId: "t1",
    workspaceId: "w1",
    userId: "u1",
    target: "github",
    actionType: "github_create_issue",
    idempotencyKey: "idem-gh1",
    parameters: { owner: "domus", repo: "corp", title: "New issue" },
    riskLevel: "MEDIUM"
  });

  assert.equal(githubReceipt.status, "SUCCESS");
  assert.equal(githubReceipt.tool, "github");
});
