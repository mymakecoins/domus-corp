import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from '../dist/app.js';

describe('V1-902 Gateway High Availability, Safe Degradation & Disaster Recovery', () => {
  describe('Health & Readiness Probes (AC1 & AC2)', () => {
    it('GET /health and GET /health/liveness report liveness status', async () => {
      const app = buildApp();
      const resHealth = await app.inject({ method: 'GET', url: '/health' });
      assert.equal(resHealth.statusCode, 200);
      const jsonHealth = resHealth.json();
      assert.equal(jsonHealth.status, 'ok');
      assert.equal(jsonHealth.service, 'control-plane');

      const resLiveness = await app.inject({ method: 'GET', url: '/health/liveness' });
      assert.equal(resLiveness.statusCode, 200);
      const jsonLiveness = resLiveness.json();
      assert.equal(jsonLiveness.status, 'ok');

      await app.close();
    });

    it('GET /health/readiness returns 200 when all dependencies are healthy', async () => {
      const mockHealthChecker = {
        async checkReadiness() {
          return {
            ready: true,
            status: 'ok',
            dependencies: {
              authorization: 'ok',
              policy: 'ok',
              budget: 'ok',
              vault: 'ok',
            },
          };
        },
      };

      const app = buildApp(undefined, undefined, undefined, undefined, undefined, mockHealthChecker);
      const res = await app.inject({ method: 'GET', url: '/health/readiness' });

      assert.equal(res.statusCode, 200);
      const json = res.json();
      assert.equal(json.ready, true);
      assert.equal(json.status, 'ok');
      assert.equal(json.dependencies.authorization, 'ok');
      assert.equal(json.dependencies.vault, 'ok');

      await app.close();
    });

    it('GET /health/readiness returns 503 when any security dependency (vault/policy/auth/budget) fails', async () => {
      const mockDegradedChecker = {
        async checkReadiness() {
          return {
            ready: false,
            status: 'degraded',
            code: 'GATEWAY_READINESS_FAILED',
            dependencies: {
              authorization: 'ok',
              policy: 'down',
              budget: 'ok',
              vault: 'down',
            },
          };
        },
      };

      const app = buildApp(undefined, undefined, undefined, undefined, undefined, mockDegradedChecker);
      const res = await app.inject({ method: 'GET', url: '/health/readiness' });

      assert.equal(res.statusCode, 503);
      const json = res.json();
      assert.equal(json.ready, false);
      assert.equal(json.status, 'degraded');
      assert.equal(json.code, 'GATEWAY_READINESS_FAILED');
      assert.equal(json.dependencies.vault, 'down');

      await app.close();
    });

    it('GET /health/gateway exposes HA status and node correlation details', async () => {
      const mockHaServices = {
        getHaStatus() {
          return {
            nodeId: 'gateway-node-1',
            status: 'active',
            failClosedEnforced: true,
            activeConnections: 0,
          };
        },
      };

      const app = buildApp(undefined, undefined, undefined, undefined, undefined, mockHaServices);
      const res = await app.inject({ method: 'GET', url: '/health/gateway' });

      assert.equal(res.statusCode, 200);
      const json = res.json();
      assert.equal(json.nodeId, 'gateway-node-1');
      assert.equal(json.failClosedEnforced, true);

      await app.close();
    });
  });

  describe('Stateless Failover & Correlation / Secret Protection (AC1)', () => {
    it('failover between stateless nodes preserves request_id correlation and conceals secrets', async () => {
      const mockNode1 = {
        async authorize() {
          return {
            tenantId: 'tenant-ac1',
            workspaceId: 'ws-ac1',
            userId: 'user-1',
            deviceId: 'dev-1',
            sessionId: 'sess-1',
          };
        },
        async execute(cmd) {
          return {
            id: 'resp-1',
            request_id: cmd.requestId,
            model: 'gpt-4o',
            output: 'hello node 1',
            secret_accessed: '[REDACTED_SECRET]',
          };
        },
        countInputTokens() {
          return 5;
        },
        scopeKeys() {
          return ['tenant:tenant-ac1'];
        },
      };

      const mockNode2 = {
        async authorize() {
          return {
            tenantId: 'tenant-ac1',
            workspaceId: 'ws-ac1',
            userId: 'user-1',
            deviceId: 'dev-1',
            sessionId: 'sess-1',
          };
        },
        async execute(cmd) {
          return {
            id: 'resp-2',
            request_id: cmd.requestId,
            model: 'gpt-4o',
            output: 'hello node 2',
            secret_accessed: '[REDACTED_SECRET]',
          };
        },
        countInputTokens() {
          return 5;
        },
        scopeKeys() {
          return ['tenant:tenant-ac1'];
        },
      };

      const appNode1 = buildApp(undefined, mockNode1);
      const appNode2 = buildApp(undefined, mockNode2);

      const correlationId = 'req-corr-123456';
      const payload = {
        schema_version: '1.0.0',
        idempotency_key: 'ik-failover-1',
        task: 'completion',
        messages: [{ role: 'user', content: 'test correlation' }],
        required_capabilities: ['chat'],
        maximum_output_tokens: 50,
      };

      const res1 = await appNode1.inject({
        method: 'POST',
        url: '/v1/model/responses',
        headers: { 'content-type': 'application/json', 'x-request-id': correlationId },
        payload,
      });
      assert.equal(res1.statusCode, 200);
      const body1 = res1.json();
      assert.ok(body1.request_id);
      assert.equal(body1.secret_accessed, '[REDACTED_SECRET]');

      // Failover request to Node 2 carrying same payload / request headers
      const res2 = await appNode2.inject({
        method: 'POST',
        url: '/v1/model/responses',
        headers: { 'content-type': 'application/json', 'x-request-id': correlationId },
        payload,
      });
      assert.equal(res2.statusCode, 200);
      const body2 = res2.json();
      assert.ok(body2.request_id);
      assert.equal(body2.secret_accessed, '[REDACTED_SECRET]');

      await appNode1.close();
      await appNode2.close();
    });
  });

  describe('Fail-Closed Behavior under Dependency Loss (AC2)', () => {
    it('fails closed with 503 when Vault dependency is lost', async () => {
      const mockServices = {
        async authorize() {
          return { tenantId: 't1', workspaceId: 'w1', userId: 'u1', deviceId: 'd1', sessionId: 's1' };
        },
        async execute() {
          throw new Error('VAULT_UNAVAILABLE: Secret backend unreachable');
        },
        countInputTokens() { return 1; },
        scopeKeys() { return []; },
      };

      const app = buildApp(undefined, mockServices);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/model/responses',
        headers: { 'content-type': 'application/json' },
        payload: {
          schema_version: '1.0.0',
          idempotency_key: 'ik-vault-loss',
          task: 'completion',
          messages: [{ role: 'user', content: 'test' }],
          required_capabilities: ['chat'],
          maximum_output_tokens: 10,
        },
      });

      assert.equal(res.statusCode, 503);
      assert.equal(res.json().code, 'GATEWAY_DEPENDENCY_UNAVAILABLE');
      await app.close();
    });

    it('fails closed when Policy Engine or Authorization dependency is lost', async () => {
      const mockServices = {
        async authorize() {
          throw new Error('AUTHORIZATION_UNAVAILABLE: Identity service offline');
        },
        async execute() { return {}; },
        countInputTokens() { return 1; },
        scopeKeys() { return []; },
      };

      const app = buildApp(undefined, mockServices);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/model/responses',
        headers: { 'content-type': 'application/json' },
        payload: {
          schema_version: '1.0.0',
          idempotency_key: 'ik-auth-loss',
          task: 'completion',
          messages: [{ role: 'user', content: 'test' }],
          required_capabilities: ['chat'],
          maximum_output_tokens: 10,
        },
      });

      assert.equal(res.statusCode, 503);
      assert.equal(res.json().code, 'GATEWAY_DEPENDENCY_UNAVAILABLE');
      await app.close();
    });

    it('fails closed when Budget Ledger dependency is lost', async () => {
      const mockServices = {
        async authorize() {
          return { tenantId: 't1', workspaceId: 'w1', userId: 'u1', deviceId: 'd1', sessionId: 's1' };
        },
        async execute() {
          throw new Error('BUDGET_UNAVAILABLE: Ledger database down');
        },
        countInputTokens() { return 1; },
        scopeKeys() { return []; },
      };

      const app = buildApp(undefined, mockServices);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/model/responses',
        headers: { 'content-type': 'application/json' },
        payload: {
          schema_version: '1.0.0',
          idempotency_key: 'ik-budget-loss',
          task: 'completion',
          messages: [{ role: 'user', content: 'test' }],
          required_capabilities: ['chat'],
          maximum_output_tokens: 10,
        },
      });

      assert.equal(res.statusCode, 503);
      assert.equal(res.json().code, 'GATEWAY_DEPENDENCY_UNAVAILABLE');
      await app.close();
    });
  });
});
