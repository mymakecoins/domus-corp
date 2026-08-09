import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChatService } from '../dist/main/main/application/chat-service.js';

test('chat service allows one active generation and propagates cancellation', async () => {
  let release;
  const signalSeen=[];
  const service=createChatService({transport:{async *start(_input,signal){signalSeen.push(signal);yield {schema_version:'1.0.0',request_id:'11111111-1111-4111-8111-111111111111',sequence:0,type:'started',occurred_at:'2026-08-09T12:00:00Z'};await new Promise(resolve=>{release=resolve;});yield {schema_version:'1.0.0',request_id:'11111111-1111-4111-8111-111111111111',sequence:1,type:'cancelled',occurred_at:'2026-08-09T12:00:01Z'};}},ids:{next:()=> '1234567890abcdef'},history:{save:async()=>{}},clock:{now:()=>new Date('2026-08-09T12:00:00Z')}});
  const events=[];const running=service.start({messages:[{role:'user',content:'hello'}],maximumOutputTokens:20},event=>events.push(event));
  await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(()=>service.start({messages:[{role:'user',content:'other'}],maximumOutputTokens:20},()=>{}),/CHAT_ALREADY_ACTIVE/);
  service.cancel();assert.equal(signalSeen[0].aborted,true);release();await running;
  assert.deepEqual(events.map(value=>value.type),['started','cancelled']);
});

test('chat service rejects closed or oversized renderer payloads', async () => {
  const service=createChatService({transport:{async *start(){}},ids:{next:()=> '1234567890abcdef'},history:{save:async()=>{}},clock:{now:()=>new Date()}});
  await assert.rejects(()=>service.start({messages:[{role:'user',content:'x'.repeat(65537)}],maximumOutputTokens:20},()=>{}),/CHAT_REQUEST_INVALID/);
  await assert.rejects(()=>service.start({messages:[{role:'user',content:'ok'}],maximumOutputTokens:20,tenantId:'attacker'},()=>{}),/CHAT_REQUEST_INVALID/);
});
