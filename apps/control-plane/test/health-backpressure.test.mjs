import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/app.js';

describe('Gateway Backpressure Shedding', () => {
  it('should return 503 with GATEWAY_BACKPRESSURE_SHEDDING when gateway database pool is saturated', async () => {
    const mockServices = {
      async authorize() {
        return {
          tenantId: 'tenant-1',
          workspaceId: 'ws-1',
          userId: 'user-1',
          deviceId: 'dev-1',
          sessionId: 'sess-1',
        };
      },
      async execute() {
        throw new Error('GATEWAY_BACKPRESSURE_SHEDDING: Database pool saturated at 92%');
      },
      countInputTokens() {
        return 10;
      },
      scopeKeys() {
        return ['tenant:tenant-1'];
      },
    };

    const app = buildApp(undefined, mockServices);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/model/responses',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        schema_version: '1.0.0',
        idempotency_key: 'ik-12345678',
        task: 'completion',
        messages: [{ role: 'user', content: 'hello' }],
        required_capabilities: ['chat'],
        maximum_output_tokens: 100,
      },
    });

    assert.equal(response.statusCode, 503);
    const body = JSON.parse(response.body);
    assert.equal(body.code, 'GATEWAY_BACKPRESSURE_SHEDDING');
  });
});
