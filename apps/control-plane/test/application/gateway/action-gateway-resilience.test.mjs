// apps/control-plane/test/application/gateway/action-gateway-resilience.test.mjs
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ActionGatewayService } from "../../../dist/application/gateway/action-gateway-service.js";
import { KillSwitchGuard } from "../../../dist/domain/gateway/kill-switch.js";
import { InMemoryIdempotencyService } from "../../../dist/domain/gateway/idempotency.js";
import { ToolGuardrailService } from "../../../dist/application/mcp/tool-guardrail-service.js";

describe("ActionGatewayService - Resilience, Idempotency & Reconciliation (V1-805)", () => {
  let killSwitch;
  let idempotency;
  let mockPolicyEngine;
  let guardrailService;

  beforeEach(() => {
    killSwitch = new KillSwitchGuard();
    idempotency = new InMemoryIdempotencyService();
    mockPolicyEngine = {
      getPolicy: async () => ({ decision: "ALLOW" }),
    };
    guardrailService = new ToolGuardrailService();
  });

  describe("Critério 1: Confirmação e Aprovação Explícita de Ações Externas", () => {
    it("dado ação de alto risco sem confirmação, quando chegar ao gateway, nenhum connector é chamado", async () => {
      let callCount = 0;
      const mockConnector = {
        execute: async () => {
          callCount++;
          return { ok: true };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        toolGuardrailService: guardrailService,
        defaultConnector: mockConnector,
      });

      await assert.rejects(
        async () => {
          await gateway.executeAction({
            actionId: "act-unapproved-1",
            tenantId: "t-1",
            workspaceId: "w-1",
            userId: "u-1",
            actionType: "external_action",
            target: "payment_gateway:transfer",
            parameters: { amount: 1000 },
            riskLevel: "HIGH",
            idempotencyKey: "idem-unapproved-1",
          });
        },
        (err) => err.message === "MCP_APPROVAL_REQUIRED"
      );

      assert.equal(callCount, 0, "Nenhum connector deve ser chamado sem aprovação explícita");
    });

    it("dado ação de risco crítico sem token nem approvalId, gateway rejeita e não chama connector em tentativas repetidas", async () => {
      let callCount = 0;
      const mockConnector = {
        execute: async () => {
          callCount++;
          return { ok: true };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        toolGuardrailService: guardrailService,
        defaultConnector: mockConnector,
      });

      for (let i = 0; i < 3; i++) {
        await assert.rejects(
          async () => {
            await gateway.executeAction({
              actionId: `act-critical-${i}`,
              tenantId: "t-1",
              workspaceId: "w-1",
              userId: "u-1",
              actionType: "delete_database",
              target: "db:drop",
              parameters: {},
              riskLevel: "CRITICAL",
              idempotencyKey: `idem-critical-${i}`,
            });
          },
          (err) => err.message === "MCP_APPROVAL_REQUIRED"
        );
      }

      assert.equal(callCount, 0, "Connector nunca deve ser invocado em chamadas sem confirmação");
    });

    it("dado ação com token de confirmação válido, gateway autoriza e chama connector exatamente uma vez", async () => {
      let callCount = 0;
      const mockConnector = {
        execute: async () => {
          callCount++;
          return { status: "EXECUTED", txId: "tx-999" };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        toolGuardrailService: guardrailService,
        defaultConnector: mockConnector,
      });

      const receipt = await gateway.executeAction({
        actionId: "act-approved-1",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "external_action",
        target: "payment_gateway:transfer",
        parameters: { amount: 1000 },
        riskLevel: "HIGH",
        confirmationToken: "valid-token-123",
        idempotencyKey: "idem-approved-1",
      });

      assert.equal(receipt.status, "SUCCESS");
      assert.deepEqual(receipt.result, { status: "EXECUTED", txId: "tx-999" });
      assert.equal(callCount, 1, "Connector deve ser chamado exatamente uma vez para ação aprovada");
    });
  });

  describe("Critério 2: Deduplicação sob Retries, Replays, Timeouts e Concorrência", () => {
    it("dado timeout post-dispatch, retry com a mesma chave consulta estado e não duplica a operação", async () => {
      let executeCount = 0;
      const timeoutConnector = {
        execute: async () => {
          executeCount++;
          const err = new Error("POST_DISPATCH_TIMEOUT_GATEWAY_30000ms");
          err.isTimeoutPostDispatch = true;
          throw err;
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: timeoutConnector,
        maxRetries: 2,
        retryBackoffMs: 1,
      });

      const firstReceipt = await gateway.executeAction({
        actionId: "act-timeout-retry-1",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "external_payout",
        target: "bank_api",
        parameters: { recipient: "acc-1" },
        riskLevel: "LOW",
        idempotencyKey: "idem-key-timeout-dedup",
      });

      assert.equal(firstReceipt.status, "INCONCLUSIVE");
      assert.equal(executeCount, 1);

      const retryReceipt = await gateway.executeAction({
        actionId: "act-timeout-retry-1-replay",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "external_payout",
        target: "bank_api",
        parameters: { recipient: "acc-1" },
        riskLevel: "LOW",
        idempotencyKey: "idem-key-timeout-dedup",
      });

      assert.equal(retryReceipt.status, "INCONCLUSIVE");
      assert.equal(executeCount, 1, "Deduplicação garantida: connector não pode ser invocado novamente no retry após post-dispatch timeout");
    });

    it("dado reprocessamento de fila (10 replays), connector é executado apenas uma vez", async () => {
      let executeCount = 0;
      const mockConnector = {
        execute: async () => {
          executeCount++;
          return { orderId: "ord-888" };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: mockConnector,
      });

      const idempotencyKey = "idem-queue-replay-key";
      const receipts = [];

      for (let i = 0; i < 10; i++) {
        const r = await gateway.executeAction({
          actionId: `act-queue-${i}`,
          tenantId: "t-1",
          workspaceId: "w-1",
          userId: "u-1",
          actionType: "process_order",
          target: "erp",
          parameters: { orderId: "ord-888" },
          riskLevel: "LOW",
          idempotencyKey,
        });
        receipts.push(r);
      }

      assert.equal(executeCount, 1, "Connector executado estritamente uma vez para 10 mensagens reprocessadas");
      for (const r of receipts) {
        assert.equal(r.status, "SUCCESS");
        assert.deepEqual(r.result, { orderId: "ord-888" });
      }
    });

    it("dado concorrência com a mesma chave idempotente, apenas uma execução ocorre", async () => {
      let executeCount = 0;
      const slowConnector = {
        execute: async () => {
          executeCount++;
          await new Promise((res) => setTimeout(res, 20));
          return { done: true };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: slowConnector,
      });

      const idempotencyKey = "idem-concurrent-key";

      const p1 = gateway.executeAction({
        actionId: "act-conc-1",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "sync_item",
        target: "crm",
        parameters: {},
        riskLevel: "LOW",
        idempotencyKey,
      });

      const p2 = gateway.executeAction({
        actionId: "act-conc-2",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "sync_item",
        target: "crm",
        parameters: {},
        riskLevel: "LOW",
        idempotencyKey,
      });

      const [r1, r2] = await Promise.all([p1, p2]);

      assert.equal(executeCount, 1, "Connector não pode ser invocado mais de uma vez sob concorrência");
      const statuses = [r1.status, r2.status];
      assert.ok(statuses.includes("SUCCESS") || statuses.includes("IN_PROGRESS"));
    });
  });

  describe("Critério 3: Respostas Ambíguas e Reconciliação Segura", () => {
    it("dado resposta ambígua, registra status INCONCLUSIVE e persiste recibo para reconciliação", async () => {
      const ambiguousConnector = {
        execute: async () => {
          const err = new Error("NETWORK_PARTIAL_DISCONNECT");
          err.isTimeoutPostDispatch = true;
          throw err;
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: ambiguousConnector,
      });

      const receipt = await gateway.executeAction({
        actionId: "act-ambiguous-1",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "remote_deploy",
        target: "k8s_cluster",
        parameters: { deployment: "api" },
        riskLevel: "LOW",
        idempotencyKey: "idem-ambiguous-1",
      });

      assert.equal(receipt.status, "INCONCLUSIVE");
      assert.equal(receipt.error, "NETWORK_PARTIAL_DISCONNECT");

      const storedReceipt = await idempotency.getReceipt("idem-ambiguous-1");
      assert.notEqual(storedReceipt, null);
      assert.equal(storedReceipt?.status, "INCONCLUSIVE");
    });

    it("dado estado INCONCLUSIVE, reconcileAction consulta checkStatus e transiciona para SUCCESS sem reexecutar connector", async () => {
      let executeCount = 0;
      let checkStatusCount = 0;

      const reconcilableConnector = {
        execute: async () => {
          executeCount++;
          const err = new Error("POST_DISPATCH_TIMEOUT");
          err.isTimeoutPostDispatch = true;
          throw err;
        },
        checkStatus: async (key) => {
          checkStatusCount++;
          assert.equal(key, "idem-reconcile-success");
          if (checkStatusCount === 1) {
            // No primeiro checkStatus durante executeAction, o conector externo ainda não concluiu
            return { executed: false };
          }
          // Na reconciliação posterior, a transação foi confirmada
          return { executed: true, result: { deployId: "dep-777", confirmed: true } };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: reconcilableConnector,
      });

      // 1. Execução inicial falha com post-dispatch timeout -> INCONCLUSIVE
      const initialReceipt = await gateway.executeAction({
        actionId: "act-reconcile-1",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "remote_deploy",
        target: "k8s_cluster",
        parameters: { deployment: "api" },
        riskLevel: "LOW",
        idempotencyKey: "idem-reconcile-success",
      });

      assert.equal(initialReceipt.status, "INCONCLUSIVE");
      assert.equal(executeCount, 1);
      assert.equal(checkStatusCount, 1);

      // 2. Processo de Reconciliação
      const reconciledReceipt = await gateway.reconcileAction("idem-reconcile-success");

      assert.notEqual(reconciledReceipt, null);
      assert.equal(reconciledReceipt?.status, "SUCCESS");
      assert.deepEqual(reconciledReceipt?.result, { deployId: "dep-777", confirmed: true });
      assert.equal(executeCount, 1, "reconcileAction NUNCA re-executa a operação externa");
      assert.equal(checkStatusCount, 2);

      // 3. Verifica persistência da atualização
      const finalStored = await idempotency.getReceipt("idem-reconcile-success");
      assert.equal(finalStored?.status, "SUCCESS");
    });

    it("dado estado INCONCLUSIVE quando checkStatus confirma falha externa, reconcileAction transiciona para FAILED", async () => {
      let executeCount = 0;

      const failingStatusConnector = {
        execute: async () => {
          executeCount++;
          const err = new Error("POST_DISPATCH_TIMEOUT");
          err.isTimeoutPostDispatch = true;
          throw err;
        },
        checkStatus: async () => {
          return { executed: false, error: "EXTERNAL_TRANSACTION_REJECTED" };
        },
      };

      const gateway = new ActionGatewayService({
        killSwitch,
        idempotency,
        getPolicy: mockPolicyEngine.getPolicy,
        defaultConnector: failingStatusConnector,
      });

      await gateway.executeAction({
        actionId: "act-reconcile-2",
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        actionType: "remote_deploy",
        target: "k8s_cluster",
        parameters: {},
        riskLevel: "LOW",
        idempotencyKey: "idem-reconcile-failed",
      });

      const reconciledReceipt = await gateway.reconcileAction("idem-reconcile-failed");

      assert.equal(reconciledReceipt?.status, "FAILED");
      assert.equal(reconciledReceipt?.error, "EXTERNAL_TRANSACTION_REJECTED");
      assert.equal(executeCount, 1);
    });
  });
});
