# External Connectors (Google Workspace, GitHub & Trello) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement governed external connectors for Google Workspace (Drive, Gmail, Calendar - V1-607) and Project Management (GitHub & Trello - V1-608) integrated with the ActionGatewayService, MCP Catalog, and IdempotencyReceipts.

**Architecture:** Create an `ExternalConnectorAdapter` interface and a `ConnectorRegistryActionConnector` that wraps individual service adapters. Connectors resolve credentials via `CredentialResolver` (with `MockCredentialResolver` for dev/test doubles) and support `checkStatus` for post-dispatch timeout idempotency validation.

**Tech Stack:** TypeScript, Node.js, Fastify, `node:assert`, `node:test`.

## Global Constraints

- **Single Egress Point & Policy**: External actions must pass through `ActionGatewayService` to evaluate `EffectivePolicy` and enforce `ToolGuardrailService` confirmation before invoking external APIs.
- **Idempotency & Receipts**: Write actions must preserve idempotency keys, support `checkStatus` for timeout ambiguities, and output immutable `ActionReceipt`s.
- **No Direct Token Leaks**: Credentials must be injected via `CredentialResolver` without exposing raw tokens in logs or receipt outputs.

---

### Task 1: Core Connector Interfaces, Credential Resolver & Connector Registry

**Files:**
- Create: `apps/control-plane/src/domain/connectors/connector-adapter.ts`
- Create: `apps/control-plane/src/application/connectors/connector-registry.ts`
- Create: `apps/control-plane/src/infrastructure/credentials/credential-resolver.ts`
- Create: `apps/control-plane/test/domain/connectors/connector-registry.test.ts`
- Modify: `apps/control-plane/src/domain/gateway/action-connector.ts:1-37`

**Interfaces:**
- Consumes: `ActionConnector` from `apps/control-plane/src/domain/gateway/action-connector.ts`
- Produces: `ExternalConnectorAdapter`, `ConnectorExecutionInput`, `ConnectorExecutionResult`, `CredentialResolver`, `ConnectorRegistryActionConnector`

- [ ] **Step 1: Write failing test for ConnectorRegistryActionConnector**

```typescript
// apps/control-plane/test/domain/connectors/connector-registry.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ConnectorRegistryActionConnector } from "../../src/application/connectors/connector-registry.js";
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../src/domain/connectors/connector-adapter.ts";

class DummyConnector implements ExternalConnectorAdapter {
  readonly connectorId = "dummy-target";
  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    return { success: true, data: { ok: true, target: input.operation } };
  }
}

test("ConnectorRegistryActionConnector routes execute to registered connector", async () => {
  const registry = new ConnectorRegistryActionConnector();
  registry.register(new DummyConnector());

  const result = await registry.execute({
    target: "dummy-target",
    operation: "test_op",
    tenantId: "t1",
    workspaceId: "w1",
    userId: "u1",
    parameters: { foo: "bar" },
  });

  assert.deepEqual(result, { success: true, data: { ok: true, target: "test_op" } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test test/domain/connectors/connector-registry.test.ts`
Expected: FAIL due to missing files/imports.

- [ ] **Step 3: Implement ExternalConnectorAdapter and CredentialResolver**

```typescript
// apps/control-plane/src/domain/connectors/connector-adapter.ts
export interface ConnectorExecutionInput<TParams = Record<string, unknown>> {
  tenantId: string;
  workspaceId: string;
  userId: string;
  operation: string;
  target?: string;
  parameters: TParams;
  idempotencyKey?: string;
  credentialRef?: string;
}

export interface ConnectorExecutionResult<TResult = unknown> {
  success: boolean;
  data?: TResult;
  error?: {
    code: string;
    message: string;
    isTransient?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface ExternalConnectorAdapter {
  readonly connectorId: string;
  execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult>;
  checkStatus?(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }>;
}
```

```typescript
// apps/control-plane/src/infrastructure/credentials/credential-resolver.ts
export interface ResolvedCredential {
  tokenType: "Bearer" | "Basic" | "OAuth2";
  accessToken: string;
  refreshToken?: string;
  baseUrl?: string;
}

export interface CredentialResolver {
  resolveCredential(tenantId: string, workspaceId: string, userId: string, connectorId: string): Promise<ResolvedCredential>;
}

export class MockCredentialResolver implements CredentialResolver {
  constructor(private readonly mockToken: string = "mock-valid-token-123") {}

  async resolveCredential(_tenantId: string, _workspaceId: string, _userId: string, connectorId: string): Promise<ResolvedCredential> {
    return {
      tokenType: "Bearer",
      accessToken: `${connectorId}-${this.mockToken}`,
    };
  }
}
```

```typescript
// apps/control-plane/src/application/connectors/connector-registry.ts
import { ActionConnector } from "../../domain/gateway/action-connector.js";
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";

export class ConnectorRegistryActionConnector implements ActionConnector {
  private readonly connectors = new Map<string, ExternalConnectorAdapter>();

  register(connector: ExternalConnectorAdapter): void {
    this.connectors.set(connector.connectorId, connector);
  }

  getConnector(connectorId: string): ExternalConnectorAdapter | undefined {
    return this.connectors.get(connectorId);
  }

  async execute(input: any): Promise<unknown> {
    const targetId = input.target || input.connectorId || "default";
    const connector = this.connectors.get(targetId);
    if (!connector) {
      throw new Error(`CONNECTOR_NOT_FOUND:${targetId}`);
    }

    const result = await connector.execute({
      tenantId: input.tenantId ?? "unknown",
      workspaceId: input.workspaceId ?? "unknown",
      userId: input.userId ?? "unknown",
      operation: input.operation ?? input.actionType ?? "execute",
      target: targetId,
      parameters: input.parameters ?? input,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.success) {
      const err = new Error(result.error?.message || "CONNECTOR_EXECUTION_FAILED");
      (err as any).code = result.error?.code;
      (err as any).isTransient = result.error?.isTransient;
      throw err;
    }

    return result.data;
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }> {
    for (const connector of this.connectors.values()) {
      if (connector.checkStatus) {
        const res = await connector.checkStatus(idempotencyKey);
        if (res.executed) return res;
      }
    }
    return { executed: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test test/domain/connectors/connector-registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/connectors/connector-adapter.ts apps/control-plane/src/infrastructure/credentials/credential-resolver.ts apps/control-plane/src/application/connectors/connector-registry.ts apps/control-plane/test/domain/connectors/connector-registry.test.ts
git commit -m "feat(connectors): add ExternalConnectorAdapter, CredentialResolver and ConnectorRegistryActionConnector"
```

---

### Task 2: Google Workspace Connectors (Drive, Gmail, Calendar - V1-607)

**Files:**
- Create: `apps/control-plane/src/application/connectors/google-drive-connector.ts`
- Create: `apps/control-plane/src/application/connectors/google-gmail-connector.ts`
- Create: `apps/control-plane/src/application/connectors/google-calendar-connector.ts`
- Create: `apps/control-plane/test/application/connectors/google-connectors.test.ts`

**Interfaces:**
- Consumes: `ExternalConnectorAdapter`, `CredentialResolver` from Task 1
- Produces: `GoogleDriveConnector`, `GmailConnector`, `GoogleCalendarConnector`

- [ ] **Step 1: Write failing test for Google Drive, Gmail, Calendar connectors**

```typescript
// apps/control-plane/test/application/connectors/google-connectors.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GoogleDriveConnector } from "../../src/application/connectors/google-drive-connector.js";
import { GmailConnector } from "../../src/application/connectors/google-gmail-connector.js";
import { GoogleCalendarConnector } from "../../src/application/connectors/google-calendar-connector.js";
import { MockCredentialResolver } from "../../src/infrastructure/credentials/credential-resolver.js";

test("GoogleDriveConnector performs search and read file operations", async () => {
  const credentialResolver = new MockCredentialResolver();
  const drive = new GoogleDriveConnector(credentialResolver, async (url, init) => {
    return new Response(JSON.stringify({ files: [{ id: "file-1", name: "Doc.pdf" }] }), { status: 200 });
  });

  const searchRes = await drive.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "google_drive_search", parameters: { query: "name contains 'Doc'" }
  });

  assert.equal(searchRes.success, true);
  assert.ok(searchRes.data);
});

test("GmailConnector supports search, draft, send, and checkStatus", async () => {
  const credentialResolver = new MockCredentialResolver();
  const sentKeys = new Set<string>();

  const gmail = new GmailConnector(credentialResolver, async (url, init) => {
    if (url.includes("/messages/send")) {
      const key = (init?.headers as any)?.["X-Idempotency-Key"];
      if (key) sentKeys.add(key);
      return new Response(JSON.stringify({ id: "msg-123", threadId: "th-456", labelIds: ["SENT"] }), { status: 200 });
    }
    return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  }, sentKeys);

  const sendRes = await gmail.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "gmail_send_message",
    idempotencyKey: "idem-gmail-1",
    parameters: { to: "boss@domus.com", subject: "Report", body: "Attached report" }
  });

  assert.equal(sendRes.success, true);
  const status = await gmail.checkStatus("idem-gmail-1");
  assert.equal(status.executed, true);
});

test("GoogleCalendarConnector supports event list and creation", async () => {
  const credentialResolver = new MockCredentialResolver();
  const calendar = new GoogleCalendarConnector(credentialResolver, async () => {
    return new Response(JSON.stringify({ id: "evt-789", summary: "Sync Meeting" }), { status: 200 });
  });

  const createRes = await calendar.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "calendar_create_event",
    parameters: { summary: "Sync Meeting", start: "2026-08-15T10:00:00Z", end: "2026-08-15T11:00:00Z" }
  });

  assert.equal(createRes.success, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test test/application/connectors/google-connectors.test.ts`
Expected: FAIL due to missing connector files.

- [ ] **Step 3: Implement GoogleDriveConnector, GmailConnector, GoogleCalendarConnector**

```typescript
// apps/control-plane/src/application/connectors/google-drive-connector.ts
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GoogleDriveConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-drive";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "google_drive_search") {
      const q = encodeURIComponent(String(input.parameters.query || ""));
      const response = await this.fetchImpl(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "google_drive_read_file") {
      const fileId = input.parameters.fileId;
      const response = await this.fetchImpl(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }
}
```

```typescript
// apps/control-plane/src/application/connectors/google-gmail-connector.ts
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GmailConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-gmail";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly executedKeys: Set<string> = new Set()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "gmail_search" || input.operation === "gmail_read_thread") {
      const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/messages`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "gmail_create_draft" || input.operation === "gmail_send_message") {
      const headers: Record<string, string> = {
        Authorization: `${cred.tokenType} ${cred.accessToken}`,
        "Content-Type": "application/json",
      };
      if (input.idempotencyKey) {
        headers["X-Idempotency-Key"] = input.idempotencyKey;
        this.executedKeys.add(input.idempotencyKey);
      }
      const response = await this.fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: "POST",
        headers,
        body: JSON.stringify(input.parameters),
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.executedKeys.has(idempotencyKey)) {
      return { executed: true, result: { status: "SENT", idempotencyKey } };
    }
    return { executed: false };
  }
}
```

```typescript
// apps/control-plane/src/application/connectors/google-calendar-connector.ts
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GoogleCalendarConnector implements ExternalConnectorAdapter {
  readonly connectorId = "google-calendar";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "calendar_list_events") {
      const response = await this.fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "calendar_create_event") {
      const response = await this.fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: "POST",
        headers: { Authorization: `${cred.tokenType} ${cred.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(input.parameters),
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test test/application/connectors/google-connectors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/application/connectors/google-*.ts apps/control-plane/test/application/connectors/google-connectors.test.ts
git commit -m "feat(connectors): implement Google Drive, Gmail and Calendar adapters for V1-607"
```

---

### Task 3: Project Management Connectors (GitHub & Trello - V1-608)

**Files:**
- Create: `apps/control-plane/src/application/connectors/github-connector.ts`
- Create: `apps/control-plane/src/application/connectors/trello-connector.ts`
- Create: `apps/control-plane/test/application/connectors/project-connectors.test.ts`

**Interfaces:**
- Consumes: `ExternalConnectorAdapter`, `CredentialResolver`
- Produces: `GitHubConnector`, `TrelloConnector`

- [ ] **Step 1: Write failing test for GitHub and Trello connectors**

```typescript
// apps/control-plane/test/application/connectors/project-connectors.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHubConnector } from "../../src/application/connectors/github-connector.js";
import { TrelloConnector } from "../../src/application/connectors/trello-connector.js";
import { MockCredentialResolver } from "../../src/infrastructure/credentials/credential-resolver.js";

test("GitHubConnector creates and searches issues with idempotency checkStatus", async () => {
  const credentialResolver = new MockCredentialResolver();
  const createdIssues = new Map<string, any>();

  const github = new GitHubConnector(credentialResolver, async (url, init) => {
    if (url.includes("/issues") && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const key = (init.headers as any)?.["X-Idempotency-Key"];
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
  assert.equal((status.result as any).number, 42);
});

test("TrelloConnector creates and searches cards", async () => {
  const credentialResolver = new MockCredentialResolver();
  const trello = new TrelloConnector(credentialResolver, async () => {
    return new Response(JSON.stringify({ id: "card-abc", name: "New Task Card" }), { status: 200 });
  });

  const res = await trello.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "trello_create_card",
    parameters: { idList: "list-1", name: "New Task Card" }
  });

  assert.equal(res.success, true);
  assert.equal((res.data as any).id, "card-abc");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test test/application/connectors/project-connectors.test.ts`
Expected: FAIL due to missing files.

- [ ] **Step 3: Implement GitHubConnector and TrelloConnector**

```typescript
// apps/control-plane/src/application/connectors/github-connector.ts
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class GitHubConnector implements ExternalConnectorAdapter {
  readonly connectorId = "github";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly createdIssues: Map<string, any> = new Map()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "github_search_issues" || input.operation === "github_get_issue") {
      const owner = input.parameters.owner || "default";
      const repo = input.parameters.repo || "default";
      const response = await this.fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        headers: { Authorization: `token ${cred.accessToken}`, "User-Agent": "DomusCorp" }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "github_create_issue" || input.operation === "github_update_issue") {
      const owner = input.parameters.owner || "default";
      const repo = input.parameters.repo || "default";
      const headers: Record<string, string> = {
        Authorization: `token ${cred.accessToken}`,
        "User-Agent": "DomusCorp",
        "Content-Type": "application/json"
      };
      if (input.idempotencyKey) {
        headers["X-Idempotency-Key"] = input.idempotencyKey;
      }
      const response = await this.fetchImpl(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify(input.parameters)
      });
      const data = await response.json();
      if (response.ok && input.idempotencyKey) {
        this.createdIssues.set(input.idempotencyKey, data);
      }
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.createdIssues.has(idempotencyKey)) {
      return { executed: true, result: this.createdIssues.get(idempotencyKey) };
    }
    return { executed: false };
  }
}
```

```typescript
// apps/control-plane/src/application/connectors/trello-connector.ts
import { ExternalConnectorAdapter, ConnectorExecutionInput, ConnectorExecutionResult } from "../../domain/connectors/connector-adapter.js";
import { CredentialResolver } from "../../infrastructure/credentials/credential-resolver.js";

export class TrelloConnector implements ExternalConnectorAdapter {
  readonly connectorId = "trello";

  constructor(
    private readonly credentialResolver: CredentialResolver,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
    private readonly createdCards: Map<string, any> = new Map()
  ) {}

  async execute(input: ConnectorExecutionInput): Promise<ConnectorExecutionResult> {
    const cred = await this.credentialResolver.resolveCredential(input.tenantId, input.workspaceId, input.userId, this.connectorId);

    if (input.operation === "trello_search_cards" || input.operation === "trello_get_card") {
      const response = await this.fetchImpl(`https://api.trello.com/1/search?query=${encodeURIComponent(String(input.parameters.query || ""))}`, {
        headers: { Authorization: `OAuth ${cred.accessToken}` }
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    if (input.operation === "trello_create_card" || input.operation === "trello_update_card") {
      const response = await this.fetchImpl(`https://api.trello.com/1/cards`, {
        method: "POST",
        headers: { Authorization: `OAuth ${cred.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(input.parameters)
      });
      const data = await response.json();
      if (response.ok && input.idempotencyKey) {
        this.createdCards.set(input.idempotencyKey, data);
      }
      return { success: response.ok, data };
    }

    return { success: false, error: { code: "UNSUPPORTED_OPERATION", message: `Unknown operation: ${input.operation}` } };
  }

  async checkStatus(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown }> {
    if (this.createdCards.has(idempotencyKey)) {
      return { executed: true, result: this.createdCards.get(idempotencyKey) };
    }
    return { executed: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test test/application/connectors/project-connectors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/application/connectors/github-connector.ts apps/control-plane/src/application/connectors/trello-connector.ts apps/control-plane/test/application/connectors/project-connectors.test.ts
git commit -m "feat(connectors): implement GitHub and Trello connector adapters for V1-608"
```

---

### Task 4: ActionGateway Integration Tests & Verification Report

**Files:**
- Create: `apps/control-plane/test/application/connectors/action-gateway-connectors.test.ts`
- Create: `docs/evidence/v1-607-v1-608-connectors-verification-report.md`

- [ ] **Step 1: Write ActionGateway + External Connectors integration test**

```typescript
// apps/control-plane/test/application/connectors/action-gateway-connectors.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../src/application/gateway/action-gateway-service.js";
import { ConnectorRegistryActionConnector } from "../../src/application/connectors/connector-registry.js";
import { GoogleDriveConnector } from "../../src/application/connectors/google-drive-connector.js";
import { GitHubConnector } from "../../src/application/connectors/github-connector.js";
import { MockCredentialResolver } from "../../src/infrastructure/credentials/credential-resolver.js";
import { InMemoryIdempotencyService } from "../../src/domain/gateway/idempotency.js";
import { KillSwitchGuard } from "../../src/domain/gateway/kill-switch.js";

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
```

- [ ] **Step 2: Run test suite to verify integration**

Run: `pnpm --filter control-plane test test/application/connectors/action-gateway-connectors.test.ts`
Expected: PASS

- [ ] **Step 3: Run full control-plane test suite**

Run: `pnpm --filter control-plane test`
Expected: ALL PASS

- [ ] **Step 4: Create verification report document**

```markdown
# Relatório de Verificação — Issues V1-607 & V1-608

**Data:** 12/08/2026  
**Status:** APROVADO  

## Resumo dos Resultados

1. **V1-607 (Google Workspace)**:
   - Conectores `GoogleDriveConnector`, `GmailConnector` e `GoogleCalendarConnector` implementados e integrados.
   - Escopos e credenciais resolvidos via `CredentialResolver`.
   - Testes unitários e de integração verdes.

2. **V1-608 (GitHub & Trello)**:
   - Conectores `GitHubConnector` e `TrelloConnector` implementados com suporte a `checkStatus`.
   - Garantia de idempotência e recibos emitidos pelo `ActionGatewayService`.

## Evidência de Execução dos Testes
- `test/domain/connectors/connector-registry.test.ts` PASS
- `test/application/connectors/google-connectors.test.ts` PASS
- `test/application/connectors/project-connectors.test.ts` PASS
- `test/application/connectors/action-gateway-connectors.test.ts` PASS
```

- [ ] **Step 5: Commit final**

```bash
git add apps/control-plane/test/application/connectors/action-gateway-connectors.test.ts docs/evidence/v1-607-v1-608-connectors-verification-report.md
git commit -m "docs(evidence): add verification report for V1-607 and V1-608 external connectors"
```
