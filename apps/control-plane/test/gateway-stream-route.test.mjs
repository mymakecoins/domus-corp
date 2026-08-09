import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from 'fastify';
import { registerGatewayRoutes } from '../dist/interfaces/http/gateway/routes.js';

const body = { schema_version: '1.0.0', idempotency_key: '1234567890abcdef', task: 'chat', messages: [{ role: 'user', content: 'hello' }], required_capabilities: ['CHAT', 'STREAMING'], maximum_output_tokens: 20 };

test('stream route derives authority and emits typed no-store SSE', async () => {
  const server = Fastify();
  const calls = [];
  registerGatewayRoutes(server, {
    async authorize() { return { tenantId: 'server-tenant', workspaceId: 'server-workspace', userId: 'server-user', deviceId: 'server-device', sessionId: 'server-session' }; },
    async execute() { return {}; },
    async *stream(command) { calls.push(command); yield { schema_version: '1.0.0', request_id: command.requestId, sequence: 0, type: 'started', occurred_at: '2026-08-09T12:00:00Z' }; yield { schema_version: '1.0.0', request_id: command.requestId, sequence: 1, type: 'completed', semantic_state: 'inferida', citation_refs: [], occurred_at: '2026-08-09T12:00:01Z' }; },
    countInputTokens() { return 2; }, scopeKeys(actor) { return [{ scopeType: 'workspace', scopeId: actor.workspaceId }]; },
  });
  const response = await server.inject({ method: 'POST', url: '/v1/model/responses/stream', headers: { accept: 'text/event-stream' }, payload: body });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'], /text\/event-stream/);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.match(response.payload, /event: started/);
  assert.match(response.payload, /event: completed/);
  assert.equal(calls[0].tenantId, 'server-tenant');
  await server.close();
});

test('stream route rejects wrong accept and client authority', async () => {
  const server = Fastify();
  registerGatewayRoutes(server, { async authorize() { throw new Error('must not authorize'); }, async execute() { return {}; }, async *stream() {}, countInputTokens() { return 0; }, scopeKeys() { return []; } });
  const wrongAccept = await server.inject({ method: 'POST', url: '/v1/model/responses/stream', payload: body });
  assert.equal(wrongAccept.statusCode, 406);
  const authority = await server.inject({ method: 'POST', url: '/v1/model/responses/stream', headers: { accept: 'text/event-stream' }, payload: { ...body, tenant_id: 'attacker' } });
  assert.equal(authority.statusCode, 400);
  await server.close();
});
