# V1-604 Action Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Action Gateway for governed execution of external actions with server re-authorization, risk approval matrix, budget checking, kill switch, idempotency locks, and audit receipts.

**Architecture:** Create domain entities (`ActionRequest`, `ActionReceipt`, `KillSwitchGuard`, `IdempotencyService`, `ActionConnector`) and application orchestrator `ActionGatewayService` in `apps/control-plane`. The gateway integrates server-side reauthorization, policy engine, tool guardrails, and connector execution fail-closed.

**Tech Stack:** TypeScript (Node.js ESM), Vitest, pnpm.

## Global Constraints

- Fail-closed execution: Any missing approval, active kill switch, expired token, or policy denial must block external execution.
- Immutability: `ActionRequest` and `ActionReceipt` objects must be frozen (`Object.freeze`).
- No unauthorized external calls: Write operations (`HIGH`/`CRITICAL`) require valid confirmation tokens or approval IDs.
- Auditable receipts: All outcomes (`SUCCESS`, `FAILED`, `INCONCLUSIVE`, `KILLED`) generate an `ActionReceipt` without falsely asserting success.

---

### Task 1: Create Domain Models for ActionRequest and ActionReceipt

**Files:**
- Create: `apps/control-plane/src/domain/gateway/action-request.ts`
- Test: `apps/control-plane/tests/domain/gateway/action-request.test.ts`

**Interfaces:**
- Produces: `ActionRiskLevel`, `ActionStatus`, `ActionRequest`, `ActionReceipt`, `createActionRequest()`, `createActionReceipt()`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/control-plane/tests/domain/gateway/action-request.test.ts
import { describe, it, expect } from "vitest";
import { createActionRequest, createActionReceipt } from "../../../src/domain/gateway/action-request.js";

describe("ActionRequest Domain Model", () => {
  it("creates a valid frozen ActionRequest object", () => {
    const req = createActionRequest({
      actionId: "act-123",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: { title: "Bug fix" },
      riskLevel: "HIGH",
      idempotencyKey: "idem-key-1",
    });

    expect(req.actionId).toBe("act-123");
    expect(req.riskLevel).toBe("HIGH");
    expect(req.status).toBe("PENDING_APPROVAL");
    expect(Object.isFrozen(req)).toBe(true);
  });

  it("creates a valid frozen ActionReceipt object", () => {
    const receipt = createActionReceipt({
      actionId: "act-123",
      idempotencyKey: "idem-key-1",
      status: "SUCCESS",
      result: { issueNumber: 42 },
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      executedAt: "2026-08-12T12:00:00.000Z",
    });

    expect(receipt.actionId).toBe("act-123");
    expect(receipt.status).toBe("SUCCESS");
    expect(Object.isFrozen(receipt)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test tests/domain/gateway/action-request.test.ts`
Expected: FAIL with module not found or export missing.

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/control-plane/src/domain/gateway/action-request.ts
export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "KILLED";

export type ActionRequestInput = Readonly<{
  actionId: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  actionType: string;
  target: string;
  parameters: Record<string, unknown>;
  riskLevel: ActionRiskLevel;
  idempotencyKey: string;
  confirmationToken?: string;
  approvalId?: string;
  createdAt?: string;
}>;

export type ActionRequest = Readonly<
  ActionRequestInput & {
    status: ActionStatus;
    createdAt: string;
  }
>;

export type ActionReceiptInput = Readonly<{
  actionId: string;
  idempotencyKey: string;
  status: "SUCCESS" | "FAILED" | "INCONCLUSIVE" | "KILLED";
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  executedAt?: string;
}>;

export type ActionReceipt = Readonly<
  ActionReceiptInput & {
    executedAt: string;
  }
>;

export function createActionRequest(input: ActionRequestInput): ActionRequest {
  return Object.freeze({
    ...input,
    status: input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL" ? "PENDING_APPROVAL" : "APPROVED",
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export function createActionReceipt(input: ActionReceiptInput): ActionReceipt {
  return Object.freeze({
    ...input,
    executedAt: input.executedAt ?? new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test tests/domain/gateway/action-request.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/action-request.ts apps/control-plane/tests/domain/gateway/action-request.test.ts
git commit -m "feat(control-plane): add ActionRequest and ActionReceipt domain models for V1-604"
```

---

### Task 2: Implement Kill Switch and Idempotency Guards

**Files:**
- Create: `apps/control-plane/src/domain/gateway/kill-switch.ts`
- Create: `apps/control-plane/src/domain/gateway/idempotency.ts`
- Test: `apps/control-plane/tests/domain/gateway/kill-switch.test.ts`
- Test: `apps/control-plane/tests/domain/gateway/idempotency.test.ts`

**Interfaces:**
- Produces: `KillSwitchGuard`, `IdempotencyService`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/control-plane/tests/domain/gateway/kill-switch.test.ts
import { describe, it, expect } from "vitest";
import { KillSwitchGuard } from "../../../src/domain/gateway/kill-switch.js";

describe("KillSwitchGuard", () => {
  it("blocks actions when global or workspace kill switch is enabled", () => {
    const guard = new KillSwitchGuard();
    expect(guard.isKilled("t-1", "w-1")).toBe(false);

    guard.activateGlobal();
    expect(guard.isKilled("t-1", "w-1")).toBe(true);

    guard.deactivateGlobal();
    expect(guard.isKilled("t-1", "w-1")).toBe(false);

    guard.activateWorkspace("t-1", "w-1");
    expect(guard.isKilled("t-1", "w-1")).toBe(true);
    expect(guard.isKilled("t-1", "w-2")).toBe(false);
  });
});

// apps/control-plane/tests/domain/gateway/idempotency.test.ts
import { describe, it, expect } from "vitest";
import { IdempotencyService } from "../../../src/domain/gateway/idempotency.js";
import { createActionReceipt } from "../../../src/domain/gateway/action-request.js";

describe("IdempotencyService", () => {
  it("stores and retrieves receipts for idempotent execution", () => {
    const service = new IdempotencyService();
    const receipt = createActionReceipt({
      actionId: "act-1",
      idempotencyKey: "key-1",
      status: "SUCCESS",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      result: { ok: true },
    });

    expect(service.getReceipt("key-1")).toBeNull();
    service.saveReceipt("key-1", receipt);
    expect(service.getReceipt("key-1")).toEqual(receipt);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test tests/domain/gateway/kill-switch.test.ts tests/domain/gateway/idempotency.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/control-plane/src/domain/gateway/kill-switch.ts
export class KillSwitchGuard {
  private globalActive = false;
  private readonly activeWorkspaces = new Set<string>();

  activateGlobal(): void {
    this.globalActive = true;
  }

  deactivateGlobal(): void {
    this.globalActive = false;
  }

  activateWorkspace(tenantId: string, workspaceId: string): void {
    this.activeWorkspaces.add(`${tenantId}:${workspaceId}`);
  }

  deactivateWorkspace(tenantId: string, workspaceId: string): void {
    this.activeWorkspaces.delete(`${tenantId}:${workspaceId}`);
  }

  isKilled(tenantId: string, workspaceId: string): boolean {
    if (this.globalActive) return true;
    return this.activeWorkspaces.has(`${tenantId}:${workspaceId}`);
  }
}

// apps/control-plane/src/domain/gateway/idempotency.ts
import { ActionReceipt } from "./action-request.js";

export class IdempotencyService {
  private readonly receipts = new Map<string, ActionReceipt>();

  getReceipt(idempotencyKey: string): ActionReceipt | null {
    return this.receipts.get(idempotencyKey) ?? null;
  }

  saveReceipt(idempotencyKey: string, receipt: ActionReceipt): void {
    this.receipts.set(idempotencyKey, receipt);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test tests/domain/gateway/kill-switch.test.ts tests/domain/gateway/idempotency.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/kill-switch.ts apps/control-plane/src/domain/gateway/idempotency.ts apps/control-plane/tests/domain/gateway/kill-switch.test.ts apps/control-plane/tests/domain/gateway/idempotency.test.ts
git commit -m "feat(control-plane): add KillSwitchGuard and IdempotencyService for V1-604"
```

---

### Task 3: Implement Action Connectors Interface and Adapters

**Files:**
- Create: `apps/control-plane/src/domain/gateway/action-connector.ts`
- Test: `apps/control-plane/tests/domain/gateway/action-connector.test.ts`

**Interfaces:**
- Produces: `ActionConnector`, `HttpActionConnector`, `McpProxyActionConnector`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/control-plane/tests/domain/gateway/action-connector.test.ts
import { describe, it, expect, vi } from "vitest";
import { HttpActionConnector, McpProxyActionConnector } from "../../../src/domain/gateway/action-connector.js";

describe("ActionConnectors", () => {
  it("HttpActionConnector executes HTTP request safely", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "created" }),
    });

    const connector = new HttpActionConnector(mockFetch as unknown as typeof fetch);
    const result = await connector.execute({
      url: "https://api.example.com/item",
      method: "POST",
      body: { name: "test" },
    });

    expect(result).toEqual({ status: "created" });
  });

  it("McpProxyActionConnector delegates to McpProxyService", async () => {
    const mockProxy = {
      executeTool: vi.fn().mockResolvedValue({ status: "SUCCESS", result: "ok" }),
    };

    const connector = new McpProxyActionConnector(mockProxy as any);
    const res = await connector.execute({
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      serverId: "s-1",
      toolId: "t-1",
      parameters: {},
    });

    expect(res).toEqual({ status: "SUCCESS", result: "ok" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test tests/domain/gateway/action-connector.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/control-plane/src/domain/gateway/action-connector.ts
import { McpProxyService, McpToolExecutionInput, McpToolExecutionOutput } from "../../application/mcp/mcp-proxy-service.js";

export interface ActionConnector {
  execute(input: any): Promise<unknown>;
}

export class HttpActionConnector implements ActionConnector {
  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async execute(input: { url: string; method?: string; headers?: Record<string, string>; body?: unknown }): Promise<unknown> {
    const response = await this.fetchImpl(input.url, {
      method: input.method ?? "POST",
      headers: { "Content-Type": "application/json", ...(input.headers ?? {}) },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP_CONNECTOR_ERROR:${response.status}`);
    }

    return response.json();
  }
}

export class McpProxyActionConnector implements ActionConnector {
  constructor(private readonly proxyService: McpProxyService) {}

  async execute(input: McpToolExecutionInput): Promise<McpToolExecutionOutput> {
    return this.proxyService.executeTool(input);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test tests/domain/gateway/action-connector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/action-connector.ts apps/control-plane/tests/domain/gateway/action-connector.test.ts
git commit -m "feat(control-plane): add ActionConnector interfaces and HTTP/MCP implementations for V1-604"
```

---

### Task 4: Implement ActionGatewayService with Full Governance Pipeline

**Files:**
- Create: `apps/control-plane/src/application/gateway/action-gateway-service.ts`
- Test: `apps/control-plane/tests/application/gateway/action-gateway-service.test.ts`

**Interfaces:**
- Produces: `ActionGatewayService`, `ExecuteActionInput`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/control-plane/tests/application/gateway/action-gateway-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionGatewayService } from "../../../src/application/gateway/action-gateway-service.js";
import { KillSwitchGuard } from "../../../src/domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../../src/domain/gateway/idempotency.js";

describe("ActionGatewayService", () => {
  let killSwitch: KillSwitchGuard;
  let idempotency: IdempotencyService;
  let mockPolicyEngine: any;
  let mockGuardrailService: any;
  let mockConnector: any;
  let gateway: ActionGatewayService;

  beforeEach(() => {
    killSwitch = new KillSwitchGuard();
    idempotency = new IdempotencyService();
    mockPolicyEngine = {
      evaluatePolicy: vi.fn().mockResolvedValue({ decision: "ALLOW", allowedTools: ["github:create_issue"] }),
    };
    mockGuardrailService = {
      validatePreExecution: vi.fn().mockReturnValue({ allowed: true }),
    };
    mockConnector = {
      execute: vi.fn().mockResolvedValue({ issueNumber: 101 }),
    };

    gateway = new ActionGatewayService({
      killSwitch,
      idempotency,
      getPolicy: mockPolicyEngine.evaluatePolicy,
      toolGuardrailService: mockGuardrailService,
      defaultConnector: mockConnector,
    });
  });

  it("executes valid action successfully and generates ActionReceipt", async () => {
    const receipt = await gateway.executeAction({
      actionId: "act-1",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: { title: "Fix bug" },
      riskLevel: "LOW",
      idempotencyKey: "idem-1",
    });

    expect(receipt.status).toBe("SUCCESS");
    expect(receipt.result).toEqual({ issueNumber: 101 });
  });

  it("blocks execution fail-closed if Kill Switch is active", async () => {
    killSwitch.activateGlobal();

    const receipt = await gateway.executeAction({
      actionId: "act-2",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-2",
    });

    expect(receipt.status).toBe("KILLED");
    expect(mockConnector.execute).not.toHaveBeenCalled();
  });

  it("returns cached receipt on idempotent replay", async () => {
    await gateway.executeAction({
      actionId: "act-1",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-3",
    });

    const secondReceipt = await gateway.executeAction({
      actionId: "act-1-replay",
      tenantId: "t-1",
      workspaceId: "w-1",
      userId: "u-1",
      actionType: "mcp:tool_call",
      target: "github:create_issue",
      parameters: {},
      riskLevel: "LOW",
      idempotencyKey: "idem-3",
    });

    expect(secondReceipt.status).toBe("SUCCESS");
    expect(mockConnector.execute).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test tests/application/gateway/action-gateway-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
// apps/control-plane/src/application/gateway/action-gateway-service.ts
import { ActionRequestInput, ActionReceipt, createActionRequest, createActionReceipt } from "../../domain/gateway/action-request.js";
import { KillSwitchGuard } from "../../domain/gateway/kill-switch.js";
import { IdempotencyService } from "../../domain/gateway/idempotency.js";
import { ActionConnector } from "../../domain/gateway/action-connector.js";
import { ToolGuardrailService } from "../mcp/tool-guardrail-service.js";

export type ActionGatewayDependencies = Readonly<{
  killSwitch: KillSwitchGuard;
  idempotency: IdempotencyService;
  getPolicy: (tenantId: string, workspaceId: string, userId: string) => Promise<{ decision: string; allowedTools?: string[] }>;
  toolGuardrailService?: ToolGuardrailService;
  defaultConnector: ActionConnector;
  now?: () => string;
}>;

export class ActionGatewayService {
  private readonly killSwitch: KillSwitchGuard;
  private readonly idempotency: IdempotencyService;
  private readonly getPolicy: ActionGatewayDependencies["getPolicy"];
  private readonly toolGuardrailService?: ToolGuardrailService;
  private readonly defaultConnector: ActionConnector;
  private readonly now: () => string;

  constructor(deps: ActionGatewayDependencies) {
    this.killSwitch = deps.killSwitch;
    this.idempotency = deps.idempotency;
    this.getPolicy = deps.getPolicy;
    this.toolGuardrailService = deps.toolGuardrailService;
    this.defaultConnector = deps.defaultConnector;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async executeAction(input: ActionRequestInput): Promise<ActionReceipt> {
    const existingReceipt = this.idempotency.getReceipt(input.idempotencyKey);
    if (existingReceipt) {
      return existingReceipt;
    }

    if (this.killSwitch.isKilled(input.tenantId, input.workspaceId)) {
      const killedReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        status: "KILLED",
        error: "ACTION_KILLED_BY_KILL_SWITCH",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(input.idempotencyKey, killedReceipt);
      return killedReceipt;
    }

    const policy = await this.getPolicy(input.tenantId, input.workspaceId, input.userId);
    if (policy.decision !== "ALLOW") {
      throw new Error("ACTION_POLICY_DENIED");
    }

    const request = createActionRequest(input);

    if (this.toolGuardrailService) {
      this.toolGuardrailService.validatePreExecution({
        toolId: request.target,
        riskLevel: request.riskLevel,
        parameters: request.parameters,
        confirmationToken: request.confirmationToken,
        approvalId: request.approvalId,
      });
    }

    try {
      const rawResult = await this.defaultConnector.execute(request.parameters);
      const receipt = createActionReceipt({
        actionId: request.actionId,
        idempotencyKey: request.idempotencyKey,
        status: "SUCCESS",
        result: rawResult,
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        userId: request.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(request.idempotencyKey, receipt);
      return receipt;
    } catch (err: any) {
      const failedReceipt = createActionReceipt({
        actionId: request.actionId,
        idempotencyKey: request.idempotencyKey,
        status: "FAILED",
        error: err.message || "ACTION_EXECUTION_FAILED",
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        userId: request.userId,
        executedAt: this.now(),
      });
      this.idempotency.saveReceipt(request.idempotencyKey, failedReceipt);
      return failedReceipt;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test tests/application/gateway/action-gateway-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/application/gateway/action-gateway-service.ts apps/control-plane/tests/application/gateway/action-gateway-service.test.ts
git commit -m "feat(control-plane): implement ActionGatewayService pipeline for V1-604"
```

---

### Task 5: Run Full Test Suite Verification and Update Evidence

**Files:**
- Modify: `docs/evidence/V1-604-verificacao.md` (Create evidence summary)

- [ ] **Step 1: Run full test suite for control-plane**

Run: `pnpm --filter control-plane test`
Expected: ALL PASS

- [ ] **Step 2: Create verification evidence file**

Create `docs/evidence/V1-604-verificacao.md` documenting test results, line coverage, and DoD validation.

- [ ] **Step 3: Commit evidence**

```bash
git add docs/evidence/V1-604-verificacao.md
git commit -m "docs(evidence): add V1-604 Action Gateway verification report"
```
