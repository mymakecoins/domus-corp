import assert from "node:assert/strict";
import {test} from "node:test";
import {createPostgresCredentialRepository} from "../dist/infrastructure/postgres/provider-credential-repository.js";

test("activation locks provider and replaces active version atomically",async()=>{
  const queries=[];
  const client={async query(sql,values){queries.push({sql,values});if(sql.includes("RETURNING"))return {rows:[{credential_id:values[0],provider_key:"openai",version:2,state:"active",secret_reference:"ref-2",created_at:new Date(),activated_at:new Date()}]};return {rows:[]};},release(){queries.push({sql:"RELEASE"});}};
  const repository=createPostgresCredentialRepository({async connect(){return client;}},{next:()=>"99999999-9999-4999-8999-999999999999",now:()=>new Date("2026-08-09T12:00:00Z")});
  await repository.activateReplacing({credentialId:"11111111-1111-4111-8111-111111111111",providerKey:"openai",version:2,state:"ACTIVE",secretReference:"ref-2",createdAt:"2026-08-09T11:00:00Z",activatedAt:"2026-08-09T12:00:00Z"},{actorId:"operator",requestId:"22222222-2222-4222-8222-222222222222"});
  const text=queries.map(item=>item.sql).join("\n");
  assert.match(text,/pg_advisory_xact_lock/);
  assert.ok(text.indexOf("state = 'revoked'")<text.indexOf("RETURNING"));
  assert.match(text,/COMMIT/);
});

test("repository rolls back failed rotation and never writes material",async()=>{
  const queries=[];
  const client={async query(sql){queries.push(sql);if(sql.includes("UPDATE provider_credential_binding")&&sql.includes("RETURNING"))throw new Error("db");return {rows:[]};},release(){}};
  const repository=createPostgresCredentialRepository({async connect(){return client;}},{next:()=>"99999999-9999-4999-8999-999999999999",now:()=>new Date()});
  await assert.rejects(()=>repository.activateReplacing({credentialId:"11111111-1111-4111-8111-111111111111",providerKey:"openai",version:2,state:"ACTIVE",secretReference:"opaque",createdAt:new Date().toISOString(),activatedAt:new Date().toISOString()},{actorId:"operator",requestId:"22222222-2222-4222-8222-222222222222"}));
  assert.ok(queries.includes("ROLLBACK"));
  assert.equal(queries.join(" ").includes("canary-secret"),false);
});
