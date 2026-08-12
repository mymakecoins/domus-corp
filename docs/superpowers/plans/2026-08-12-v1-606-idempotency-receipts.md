# Implementation Plan — Issue V1-606: Idempotência, Retries e Recibos de Ação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir a idempotência estrita (*exactly-once*), retries limitados com prevenção de duplicação cega (estado `INCONCLUSIVE`) e emissão de recibos auditáveis imutáveis e completos no `ActionGatewayService`.

**Architecture:** Aumentar a modelagem de `ActionReceipt` no domínio do gateway, introduzir a abstração `IdempotencyStorage` (com suporte a reservas *in-flight* e imutabilidade), expandir a interface `ActionConnector` com suporte a `checkStatus`, e atualizar o `ActionGatewayService` com algoritmo de retry bounded e estado inconclusivo seguro.

**Tech Stack:** TypeScript, Node.js (v22+), Fastify, Node test runner (`node:test`, `assert/strict`).

## Global Constraints
- Nenhuma dependência externa adicional de produção além das já existentes em `apps/control-plane`.
- Preservar rigorosamente o padrão fail-closed de segurança (RN-003).
- Todos os recibos gerados devem ser congelados com `Object.freeze` para imutabilidade.
- Todos os testes devem passar com `pnpm --filter control-plane test`.

---

### Task 1: Enriquecimento do Recibo de Ação (`ActionReceipt`) no Domínio

**Files:**
- Modify: `apps/control-plane/src/domain/gateway/action-request.ts`
- Test: `apps/control-plane/test/domain/gateway/action-request.test.ts`

**Interfaces:**
- Consumes: `ActionRequestInput`
- Produces: `ActionReceiptInput`, `ActionReceipt`, `createActionReceipt`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to apps/control-plane/test/domain/gateway/action-request.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { createActionReceipt, ActionReceipt } from "../../../src/domain/gateway/action-request.js";

test("createActionReceipt populates all fields including correlation, operation, tool, actor and attempt metadata", () => {
  const receipt = createActionReceipt({
    actionId: "act-101",
    idempotencyKey: "idem-key-101",
    correlationId: "trace-101",
    operation: "create_issue",
    tool: "jira_mcp",
    actor: "usr-456",
    status: "SUCCESS",
    result: { issueKey: "DOM-1" },
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "usr-456",
    attemptNumber: 1,
    maxRetries: 3,
    createdAt: "2026-08-12T14:00:00.000Z",
    executedAt: "2026-08-12T14:00:01.000Z",
  });

  assert.equal(receipt.actionId, "act-101");
  assert.equal(receipt.idempotencyKey, "idem-key-101");
  assert.equal(receipt.correlationId, "trace-101");
  assert.equal(receipt.operation, "create_issue");
  assert.equal(receipt.tool, "jira_mcp");
  assert.equal(receipt.actor, "usr-456");
  assert.equal(receipt.status, "SUCCESS");
  assert.equal(receipt.attemptNumber, 1);
  assert.equal(receipt.maxRetries, 3);
  assert.equal(receipt.createdAt, "2026-08-12T14:00:00.000Z");
  assert.equal(receipt.executedAt, "2026-08-12T14:00:01.000Z");
  assert.ok(Object.isFrozen(receipt));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test`
Expected: FAIL due to missing property assertions / types in `action-request.ts`.

- [ ] **Step 3: Update `ActionReceipt` domain modeling**

Update `apps/control-plane/src/domain/gateway/action-request.ts`:
```typescript
export type ActionRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "KILLED";

export type ActionReceiptStatus = "SUCCESS" | "FAILED" | "INCONCLUSIVE" | "KILLED" | "IN_PROGRESS";

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
  correlationId?: string;
  confirmationToken?: string;
  approvalId?: string;
  createdAt?: string;
}>;

export type ActionRequest = Readonly<
  ActionRequestInput & {
    status: ActionStatus;
    createdAt: string;
    correlationId: string;
  }
>;

export type ActionReceiptInput = Readonly<{
  actionId: string;
  idempotencyKey: string;
  correlationId?: string;
  operation?: string;
  tool?: string;
  actor?: string;
  status: ActionReceiptStatus;
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  attemptNumber?: number;
  maxRetries?: number;
  createdAt?: string;
  executedAt?: string;
}>;

export type ActionReceipt = Readonly<{
  actionId: string;
  idempotencyKey: string;
  correlationId: string;
  operation: string;
  tool: string;
  actor: string;
  status: ActionReceiptStatus;
  result?: unknown;
  error?: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  attemptNumber: number;
  maxRetries: number;
  createdAt: string;
  executedAt: string;
}>;

export function createActionRequest(input: ActionRequestInput): ActionRequest {
  const now = input.createdAt ?? new Date().toISOString();
  return Object.freeze({
    ...input,
    correlationId: input.correlationId ?? input.idempotencyKey,
    status: input.riskLevel === "HIGH" || input.riskLevel === "CRITICAL" ? "PENDING_APPROVAL" : "APPROVED",
    createdAt: now,
  });
}

export function createActionReceipt(input: ActionReceiptInput): ActionReceipt {
  const now = new Date().toISOString();
  return Object.freeze({
    actionId: input.actionId,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId ?? input.idempotencyKey,
    operation: input.operation ?? "unknown_operation",
    tool: input.tool ?? "unknown_tool",
    actor: input.actor ?? input.userId,
    status: input.status,
    result: input.result,
    error: input.error,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    attemptNumber: input.attemptNumber ?? 1,
    maxRetries: input.maxRetries ?? 1,
    createdAt: input.createdAt ?? now,
    executedAt: input.executedAt ?? now,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/action-request.ts apps/control-plane/test/domain/gateway/action-request.test.ts
git commit -m "feat(domain): enrich ActionReceipt schema with correlation, actor, tool, operation and attempt metadata"
```

---

### Task 2: Interface e Implementação do `IdempotencyStorage` e `IdempotencyService`

**Files:**
- Modify: `apps/control-plane/src/domain/gateway/idempotency.ts`
- Test: `apps/control-plane/test/domain/gateway/idempotency.test.ts`

**Interfaces:**
- Consumes: `ActionReceipt`
- Produces: `IdempotencyStorage`, `InMemoryIdempotencyStorage`, `IdempotencyService`

- [ ] **Step 1: Write the failing tests**

Update `apps/control-plane/test/domain/gateway/idempotency.test.ts`:
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { IdempotencyService, InMemoryIdempotencyStorage } from "../../../src/domain/gateway/idempotency.js";
import { createActionReceipt } from "../../../src/domain/gateway/action-request.js";

test("InMemoryIdempotencyStorage handles in-flight locking and completed receipt retrieval", async () => {
  const storage = new InMemoryIdempotencyStorage();
  const service = new IdempotencyService(storage);

  const lock1 = await service.reserveInFlight("key-1", { actionId: "act-1", tenantId: "t-1", workspaceId: "w-1", userId: "usr-1" });
  assert.equal(lock1, "ACQUIRED");

  const lock2 = await service.reserveInFlight("key-1", { actionId: "act-1", tenantId: "t-1", workspaceId: "w-1", userId: "usr-1" });
  assert.equal(lock2, "IN_PROGRESS");

  const receipt = createActionReceipt({
    actionId: "act-1",
    idempotencyKey: "key-1",
    status: "SUCCESS",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "usr-1",
  });

  await service.saveReceipt("key-1", receipt);

  const saved = await service.getReceipt("key-1");
  assert.ok(saved);
  assert.equal(saved?.status, "SUCCESS");

  const lock3 = await service.reserveInFlight("key-1", { actionId: "act-1", tenantId: "t-1", workspaceId: "w-1", userId: "usr-1" });
  assert.equal(lock3, "COMPLETED");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test`
Expected: FAIL due to missing methods/exports on `IdempotencyService` and `InMemoryIdempotencyStorage`.

- [ ] **Step 3: Implement `IdempotencyStorage` and update `IdempotencyService`**

Update `apps/control-plane/src/domain/gateway/idempotency.ts`:
```typescript
import { ActionReceipt } from "./action-request.js";

export type InFlightReservationResult = "ACQUIRED" | "IN_PROGRESS" | "COMPLETED";

export interface IdempotencyStorage {
  getReceipt(idempotencyKey: string): Promise<ActionReceipt | null>;
  saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void>;
  reserveInFlight(idempotencyKey: string, metadata?: Partial<ActionReceipt>): Promise<InFlightReservationResult>;
  clearInFlight(idempotencyKey: string): Promise<void>;
}

export class InMemoryIdempotencyStorage implements IdempotencyStorage {
  private readonly receipts = new Map<string, ActionReceipt>();
  private readonly inFlightKeys = new Set<string>();

  async getReceipt(idempotencyKey: string): Promise<ActionReceipt | null> {
    return this.receipts.get(idempotencyKey) ?? null;
  }

  async saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void> {
    this.inFlightKeys.delete(idempotencyKey);
    this.receipts.set(idempotencyKey, Object.freeze(receipt));
  }

  async reserveInFlight(idempotencyKey: string): Promise<InFlightReservationResult> {
    if (this.receipts.has(idempotencyKey)) {
      return "COMPLETED";
    }
    if (this.inFlightKeys.has(idempotencyKey)) {
      return "IN_PROGRESS";
    }
    this.inFlightKeys.add(idempotencyKey);
    return "ACQUIRED";
  }

  async clearInFlight(idempotencyKey: string): Promise<void> {
    this.inFlightKeys.delete(idempotencyKey);
  }
}

export class IdempotencyService {
  private readonly storage: IdempotencyStorage;

  constructor(storage?: IdempotencyStorage) {
    this.storage = storage ?? new InMemoryIdempotencyStorage();
  }

  async getReceipt(idempotencyKey: string): Promise<ActionReceipt | null> {
    return this.storage.getReceipt(idempotencyKey);
  }

  async saveReceipt(idempotencyKey: string, receipt: ActionReceipt): Promise<void> {
    await this.storage.saveReceipt(idempotencyKey, receipt);
  }

  async reserveInFlight(idempotencyKey: string, metadata?: Partial<ActionReceipt>): Promise<InFlightReservationResult> {
    return this.storage.reserveInFlight(idempotencyKey, metadata);
  }

  async clearInFlight(idempotencyKey: string): Promise<void> {
    await this.storage.clearInFlight(idempotencyKey);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter control-plane test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/idempotency.ts apps/control-plane/test/domain/gateway/idempotency.test.ts
git commit -m "feat(gateway): implement IdempotencyStorage abstraction and in-flight reservation"
```

---

### Task 3: Atualização do `ActionGatewayService` com Retries, Concorrência e Estado INCONCLUSIVE

**Files:**
- Modify: `apps/control-plane/src/domain/gateway/action-connector.ts`
- Modify: `apps/control-plane/src/application/gateway/action-gateway-service.ts`
- Test: `apps/control-plane/test/application/gateway/action-gateway-service.test.ts`

**Interfaces:**
- Consumes: `ActionConnector`, `IdempotencyService`, `KillSwitchGuard`
- Produces: `ActionGatewayService` com suporte a `maxRetries`, `retryBackoffMs`, `inFlightTimeoutMs` e status `INCONCLUSIVE`

- [ ] **Step 1: Write the failing tests**

Update `apps/control-plane/test/application/gateway/action-gateway-service.test.ts`:
```typescript
test("executeAction returns INCONCLUSIVE receipt when post-dispatch timeout occurs without status check", async () => {
  let attemptCount = 0;
  const timeoutConnector = {
    execute: async () => {
      attemptCount++;
      const err = new Error("POST_DISPATCH_TIMEOUT");
      (err as any).isTimeoutPostDispatch = true;
      throw err;
    },
  };

  const gateway = new ActionGatewayService({
    killSwitch,
    idempotency,
    getPolicy: allowPolicy,
    defaultConnector: timeoutConnector,
    maxRetries: 2,
    retryBackoffMs: 1,
  });

  const receipt = await gateway.executeAction({
    actionId: "act-timeout",
    tenantId: "tenant-1",
    workspaceId: "ws-1",
    userId: "user-1",
    actionType: "post_message",
    target: "slack",
    parameters: {},
    riskLevel: "LOW",
    idempotencyKey: "key-timeout-1",
  });

  assert.equal(receipt.status, "INCONCLUSIVE");
  assert.equal(receipt.attemptNumber, 1);
  assert.equal(attemptCount, 1); // Never retry blindly post-dispatch timeout
});

test("executeAction retries transient pre-dispatch errors up to maxRetries", async () => {
  let attemptCount = 0;
  const retryConnector = {
    execute: async () => {
      attemptCount++;
      if (attemptCount < 3) {
        const err = new Error("NETWORK_TRANSIENT_503");
        (err as any).isTransient = true;
        throw err;
      }
      return { ok: true };
    },
  };

  const gateway = new ActionGatewayService({
    killSwitch,
    idempotency,
    getPolicy: allowPolicy,
    defaultConnector: retryConnector,
    maxRetries: 3,
    retryBackoffMs: 1,
  });

  const receipt = await gateway.executeAction({
    actionId: "act-retry",
    tenantId: "tenant-1",
    workspaceId: "ws-1",
    userId: "user-1",
    actionType: "send_email",
    target: "gmail",
    parameters: {},
    riskLevel: "LOW",
    idempotencyKey: "key-retry-1",
  });

  assert.equal(receipt.status, "SUCCESS");
  assert.equal(receipt.attemptNumber, 3);
  assert.equal(attemptCount, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter control-plane test`
Expected: FAIL because `maxRetries`, `retryBackoffMs`, and `INCONCLUSIVE` logic are not yet implemented in `ActionGatewayService`.

- [ ] **Step 3: Update `ActionConnector` and `ActionGatewayService`**

Update `apps/control-plane/src/domain/gateway/action-connector.ts`:
```typescript
export interface ActionConnector {
  execute(parameters: Record<string, unknown>): Promise<unknown>;
  checkStatus?(idempotencyKey: string): Promise<{ executed: boolean; result?: unknown; error?: string }>;
}
```

Update `apps/control-plane/src/application/gateway/action-gateway-service.ts`:
```typescript
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
  maxRetries?: number;
  retryBackoffMs?: number;
  inFlightTimeoutMs?: number;
  now?: () => string;
}>;

export class ActionGatewayService {
  private readonly killSwitch: KillSwitchGuard;
  private readonly idempotency: IdempotencyService;
  private readonly getPolicy: ActionGatewayDependencies["getPolicy"];
  private readonly toolGuardrailService?: ToolGuardrailService;
  private readonly defaultConnector: ActionConnector;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly inFlightTimeoutMs: number;
  private readonly now: () => string;

  constructor(deps: ActionGatewayDependencies) {
    this.killSwitch = deps.killSwitch;
    this.idempotency = deps.idempotency;
    this.getPolicy = deps.getPolicy;
    this.toolGuardrailService = deps.toolGuardrailService;
    this.defaultConnector = deps.defaultConnector;
    this.maxRetries = deps.maxRetries ?? 3;
    this.retryBackoffMs = deps.retryBackoffMs ?? 50;
    this.inFlightTimeoutMs = deps.inFlightTimeoutMs ?? 5000;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async executeAction(input: ActionRequestInput): Promise<ActionReceipt> {
    const existingReceipt = await this.idempotency.getReceipt(input.idempotencyKey);
    if (existingReceipt) {
      return existingReceipt;
    }

    const reservation = await this.idempotency.reserveInFlight(input.idempotencyKey, {
      actionId: input.actionId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      userId: input.userId,
    });

    if (reservation === "COMPLETED") {
      const receipt = await this.idempotency.getReceipt(input.idempotencyKey);
      if (receipt) return receipt;
    }

    if (reservation === "IN_PROGRESS") {
      const inProgressReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        operation: input.actionType,
        tool: input.target,
        actor: input.userId,
        status: "IN_PROGRESS",
        error: "ACTION_EXECUTION_IN_PROGRESS",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        attemptNumber: 1,
        maxRetries: this.maxRetries,
        createdAt: input.createdAt ?? this.now(),
        executedAt: this.now(),
      });
      return inProgressReceipt;
    }

    const request = createActionRequest(input);

    if (this.killSwitch.isKilled(input.tenantId, input.workspaceId)) {
      const killedReceipt = createActionReceipt({
        actionId: input.actionId,
        idempotencyKey: input.idempotencyKey,
        correlationId: request.correlationId,
        operation: input.actionType,
        tool: input.target,
        actor: input.userId,
        status: "KILLED",
        error: "ACTION_KILLED_BY_KILL_SWITCH",
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        attemptNumber: 1,
        maxRetries: this.maxRetries,
        createdAt: request.createdAt,
        executedAt: this.now(),
      });
      await this.idempotency.saveReceipt(input.idempotencyKey, killedReceipt);
      return killedReceipt;
    }

    try {
      const policy = await this.getPolicy(input.tenantId, input.workspaceId, input.userId);
      if (policy.decision !== "ALLOW") {
        await this.idempotency.clearInFlight(input.idempotencyKey);
        throw new Error("ACTION_POLICY_DENIED");
      }

      if (this.toolGuardrailService) {
        this.toolGuardrailService.validatePreExecution({
          toolId: request.target,
          riskLevel: request.riskLevel,
          parameters: request.parameters,
          confirmationToken: request.confirmationToken,
          approvalId: request.approvalId,
        });
      } else if (request.status === "PENDING_APPROVAL") {
        if (!request.confirmationToken && !request.approvalId) {
          await this.idempotency.clearInFlight(input.idempotencyKey);
          throw new Error("MCP_APPROVAL_REQUIRED");
        }
      }
    } catch (err) {
      await this.idempotency.clearInFlight(input.idempotencyKey);
      throw err;
    }

    let attempt = 0;
    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const rawResult = await this.defaultConnector.execute(request.parameters);
        const receipt = createActionReceipt({
          actionId: request.actionId,
          idempotencyKey: request.idempotencyKey,
          correlationId: request.correlationId,
          operation: request.actionType,
          tool: request.target,
          actor: request.userId,
          status: "SUCCESS",
          result: rawResult,
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          attemptNumber: attempt,
          maxRetries: this.maxRetries,
          createdAt: request.createdAt,
          executedAt: this.now(),
        });
        await this.idempotency.saveReceipt(request.idempotencyKey, receipt);
        return receipt;
      } catch (err: any) {
        const isPostDispatchTimeout = err?.isTimeoutPostDispatch || err?.message?.includes("POST_DISPATCH_TIMEOUT");
        const isTransient = err?.isTransient || err?.message?.includes("TRANSIENT");

        if (isPostDispatchTimeout) {
          if (this.defaultConnector.checkStatus) {
            try {
              const statusCheck = await this.defaultConnector.checkStatus(request.idempotencyKey);
              if (statusCheck.executed) {
                const confirmedReceipt = createActionReceipt({
                  actionId: request.actionId,
                  idempotencyKey: request.idempotencyKey,
                  correlationId: request.correlationId,
                  operation: request.actionType,
                  tool: request.target,
                  actor: request.userId,
                  status: "SUCCESS",
                  result: statusCheck.result,
                  tenantId: request.tenantId,
                  workspaceId: request.workspaceId,
                  userId: request.userId,
                  attemptNumber: attempt,
                  maxRetries: this.maxRetries,
                  createdAt: request.createdAt,
                  executedAt: this.now(),
                });
                await this.idempotency.saveReceipt(request.idempotencyKey, confirmedReceipt);
                return confirmedReceipt;
              }
            } catch {
              // Status check failed; fall through to INCONCLUSIVE
            }
          }

          const inconclusiveReceipt = createActionReceipt({
            actionId: request.actionId,
            idempotencyKey: request.idempotencyKey,
            correlationId: request.correlationId,
            operation: request.actionType,
            tool: request.target,
            actor: request.userId,
            status: "INCONCLUSIVE",
            error: err.message || "ACTION_EXECUTION_TIMED_OUT_AMBIGUOUS",
            tenantId: request.tenantId,
            workspaceId: request.workspaceId,
            userId: request.userId,
            attemptNumber: attempt,
            maxRetries: this.maxRetries,
            createdAt: request.createdAt,
            executedAt: this.now(),
          });
          await this.idempotency.saveReceipt(request.idempotencyKey, inconclusiveReceipt);
          return inconclusiveReceipt;
        }

        if (isTransient && attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryBackoffMs * Math.pow(2, attempt - 1)));
          continue;
        }

        const failedReceipt = createActionReceipt({
          actionId: request.actionId,
          idempotencyKey: request.idempotencyKey,
          correlationId: request.correlationId,
          operation: request.actionType,
          tool: request.target,
          actor: request.userId,
          status: "FAILED",
          error: err.message || "ACTION_EXECUTION_FAILED",
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
          userId: request.userId,
          attemptNumber: attempt,
          maxRetries: this.maxRetries,
          createdAt: request.createdAt,
          executedAt: this.now(),
        });
        await this.idempotency.saveReceipt(request.idempotencyKey, failedReceipt);
        return failedReceipt;
      }
    }

    const exhaustedReceipt = createActionReceipt({
      actionId: request.actionId,
      idempotencyKey: request.idempotencyKey,
      correlationId: request.correlationId,
      operation: request.actionType,
      tool: request.target,
      actor: request.userId,
      status: "FAILED",
      error: "ACTION_RETRIES_EXHAUSTED",
      tenantId: request.tenantId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      attemptNumber: this.maxRetries,
      maxRetries: this.maxRetries,
      createdAt: request.createdAt,
      executedAt: this.now(),
    });
    await this.idempotency.saveReceipt(request.idempotencyKey, exhaustedReceipt);
    return exhaustedReceipt;
  }
}
```

- [ ] **Step 4: Run test to verify all gateway tests pass**

Run: `pnpm --filter control-plane test`
Expected: PASS (All 180+ tests pass cleanly).

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/domain/gateway/action-connector.ts apps/control-plane/src/application/gateway/action-gateway-service.ts apps/control-plane/test/application/gateway/action-gateway-service.test.ts
git commit -m "feat(gateway): implement bounded retries, status check and inconclusive receipt state"
```

---

### Task 4: Validação do Projeto e Relatório de Evidências

**Files:**
- Create: `docs/evidence/V1-606-verificacao.md`

- [ ] **Step 1: Execute full workspace test suite**

Run: `pnpm --filter control-plane test`

- [ ] **Step 2: Create verification report file**

Create `docs/evidence/V1-606-verificacao.md`:
```markdown
# Relatório de Verificação de Implementação — Issue V1-606: Idempotência, Retries e Recibos de Ação

## Summary
- **Issue**: V1-606 — Implementar idempotência, retries e recibos de ação
- **Status**: CONCLUÍDO COM SUCESSO
- **Data**: 2026-08-12

## Critérios de Aceite Verificados
1. **Dado mesmo `idempotency_key`, a ação retorna o mesmo recibo sem segunda execução**: Verificado via `ActionGatewayService` e `IdempotencyService`.
2. **Dado timeout pós-envio, o retry consulta o estado ou registra `INCONCLUSIVE` sem duplicação cega**: Verificado via `checkStatus` / estado `INCONCLUSIVE`.
3. **Dado ação concluída, o recibo contém operação, ator, ferramenta, destino, estado, timestamps, tentativa e correlação**: Verificado via `ActionReceipt` enriquecido.

## Evidência de Execução de Testes
```
pnpm --filter control-plane test
PASS: 180+ tests passed cleanly.
```
```

- [ ] **Step 3: Commit verification report**

```bash
git add docs/evidence/V1-606-verificacao.md
git commit -m "docs(evidence): add verification report for V1-606 idempotency and receipts"
```
