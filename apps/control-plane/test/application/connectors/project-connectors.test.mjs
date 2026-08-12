import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHubConnector } from "../../../dist/application/connectors/github-connector.js";
import { TrelloConnector } from "../../../dist/application/connectors/trello-connector.js";
import { MockCredentialResolver } from "../../../dist/infrastructure/credentials/credential-resolver.js";

test("GitHubConnector creates and searches issues with idempotency checkStatus", async () => {
  const credentialResolver = new MockCredentialResolver();
  const createdIssues = new Map();

  const github = new GitHubConnector(credentialResolver, async (url, init) => {
    if (String(url).includes("/issues") && init?.method === "POST") {
      const body = JSON.parse(init.body);
      const key = init.headers?.["X-Idempotency-Key"];
      const issue = { id: 101, number: 42, title: body.title, state: "open" };
      if (key) createdIssues.set(key, issue);
      return new Response(JSON.stringify(issue), { status: 201 });
    }
    return new Response(JSON.stringify([{ id: 101, title: "Test issue" }]), { status: 200 });
  }, createdIssues);

  const res = await github.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "github_create_issue",
    idempotencyKey: "gh-idem-99",
    parameters: { owner: "domus", repo: "core", title: "Fix bug" }
  });

  assert.equal(res.success, true);
  const status = await github.checkStatus("gh-idem-99");
  assert.equal(status.executed, true);
  assert.equal(status.result.number, 42);

  const searchRes = await github.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "github_search_issues",
    parameters: { owner: "domus", repo: "core" }
  });
  assert.equal(searchRes.success, true);

  const unkRes = await github.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "github_invalid_op",
    parameters: {}
  });
  assert.equal(unkRes.success, false);
  assert.equal(unkRes.error?.code, "UNSUPPORTED_OPERATION");
});

test("TrelloConnector creates and searches cards", async () => {
  const credentialResolver = new MockCredentialResolver();
  const createdCards = new Map();
  const trello = new TrelloConnector(credentialResolver, async (url, init) => {
    if (init?.method === "POST") {
      const body = JSON.parse(init.body);
      const card = { id: "card-abc", name: body.name };
      return new Response(JSON.stringify(card), { status: 200 });
    }
    return new Response(JSON.stringify({ id: "card-abc", name: "New Task Card" }), { status: 200 });
  }, createdCards);

  const res = await trello.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "trello_create_card",
    idempotencyKey: "trello-idem-1",
    parameters: { idList: "list-1", name: "New Task Card" }
  });

  assert.equal(res.success, true);
  assert.equal(res.data.id, "card-abc");

  const status = await trello.checkStatus("trello-idem-1");
  assert.equal(status.executed, true);

  const searchRes = await trello.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "trello_search_cards",
    parameters: { query: "Task" }
  });
  assert.equal(searchRes.success, true);

  const unkRes = await trello.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "trello_invalid_op",
    parameters: {}
  });
  assert.equal(unkRes.success, false);
  assert.equal(unkRes.error?.code, "UNSUPPORTED_OPERATION");
});
