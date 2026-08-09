import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSseParser } from '../dist/main/main/domain/chat-stream.js';
import { initialChatState, reduceChatEvent } from '../dist/main/main/domain/chat-state.js';

const requestId = '11111111-1111-4111-8111-111111111111';
const event = (sequence, type, extra = {}) => ({ schema_version: '1.0.0', request_id: requestId, sequence, type, occurred_at: '2026-08-09T12:00:00Z', ...extra });

test('SSE parser handles fragmented UTF-8 frames and contiguous sequence', () => {
  const parser = createSseParser();
  const bytes = new TextEncoder().encode(`id: 0\nevent: started\ndata: ${JSON.stringify(event(0, 'started'))}\n\nid: 1\nevent: delta\ndata: ${JSON.stringify(event(1, 'delta', { text: 'olá' }))}\n\n`);
  const first = parser.push(bytes.slice(0, bytes.length - 2));
  const second = parser.push(bytes.slice(bytes.length - 2));
  assert.deepEqual([...first, ...second].map((value) => value.type), ['started', 'delta']);
});

test('SSE parser rejects gaps, duplicate terminals and oversized events', () => {
  const parser = createSseParser({ maximumEventBytes: 1024 });
  assert.throws(() => parser.push(new TextEncoder().encode(`id: 1\nevent: delta\ndata: ${JSON.stringify(event(1, 'delta', { text: 'x' }))}\n\n`)), /CHAT_STREAM_SEQUENCE_INVALID/);
  assert.throws(() => createSseParser({ maximumEventBytes: 16 }).push(new TextEncoder().encode('data: '.padEnd(32, 'x'))), /CHAT_STREAM_EVENT_TOO_LARGE/);
});

test('chat reducer distinguishes semantic completion, technical failure and interruption', () => {
  let state = reduceChatEvent(initialChatState(), event(0, 'started'));
  state = reduceChatEvent(state, event(1, 'delta', { text: 'Resposta ' }));
  state = reduceChatEvent(state, event(2, 'completed', { semantic_state: 'inferida', citation_refs: [] }));
  assert.deepEqual({ phase: state.phase, text: state.text, semantic: state.semanticState }, { phase: 'COMPLETED', text: 'Resposta ', semantic: 'inferida' });
  assert.equal(reduceChatEvent(initialChatState(), { type: 'transport_interrupted' }).phase, 'INCONCLUSIVE');
  assert.equal(reduceChatEvent(initialChatState(), event(0, 'failed', { code: 'PROVIDER_TIMEOUT' })).phase, 'FAILED');
});
