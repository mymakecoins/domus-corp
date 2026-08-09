import assert from "node:assert/strict";
import {test} from "node:test";

import {activateCredential, createPendingCredential, revokeCredential} from "../dist/domain/credentials/provider-credential.js";
import {registerProviderCredential, revokeProviderCredential, rotateProviderCredential, testProviderCredential, useProviderCredential} from "../dist/application/credentials/manage-provider-credential.js";

const base={credentialId:"11111111-1111-4111-8111-111111111111",providerKey:"openai",version:1,state:"PENDING",secretReference:"ref-opaque",createdAt:"2026-08-09T12:00:00.000Z"};

test("credential lifecycle is monotonic and revoked versions never reactivate",()=>{
  const pending=createPendingCredential(base);
  assert.throws(()=>activateCredential(pending,{testedVersion:2,activatedAt:base.createdAt}),/CREDENTIAL_TEST_REQUIRED/);
  const active=activateCredential(pending,{testedVersion:1,activatedAt:base.createdAt});
  const revoked=revokeCredential(active,base.createdAt);
  assert.throws(()=>activateCredential(revoked,{testedVersion:1,activatedAt:base.createdAt}),/CREDENTIAL_STATE_INVALID/);
});

test("registration persists only an opaque reference after secret storage",async()=>{
  const calls=[];
  const credential=await registerProviderCredential({
    vault:{async write(input){calls.push(input);return {secretReference:"logical-ref"};},async revoke(){calls.push("cleanup");}},
    repository:{async nextVersion(){return 1;},async savePending(value){calls.push(value);}},
    ids:{next:()=>base.credentialId},clock:{now:()=>new Date(base.createdAt)},
  },{providerKey:"openai",secret:"canary-secret",actorId:"operator",requestId:"request"});
  assert.equal(credential.secretReference,"logical-ref");
  assert.equal(JSON.stringify(calls).includes("canary-secret"),true);
  assert.equal(JSON.stringify(calls.at(-1)).includes("canary-secret"),false);
});

test("rotation creates a new version and atomically replaces the active binding",async()=>{
  const actions=[];
  const rotated=await rotateProviderCredential({
    vault:{async write(){return {secretReference:"new-ref"};},async revoke(reference){actions.push(`revoke:${reference}`);}},
    tester:{async test(reference){actions.push(`test:${reference}`);return {ok:true};}},
    repository:{async nextVersion(){return 2;},async savePending(){},async activateReplacing(value){actions.push(`activate:${value.version}`);return {...value,state:"ACTIVE",activatedAt:base.createdAt};}},
    ids:{next:()=>base.credentialId},clock:{now:()=>new Date(base.createdAt)},
  },{providerKey:"openai",secret:"new-canary",actorId:"operator",requestId:"request",previousSecretReference:"old-ref"});
  assert.equal(rotated.version,2);
  assert.deepEqual(actions,["test:new-ref","activate:2","revoke:old-ref"]);
});

test("registration cleans Vault material when metadata persistence fails",async()=>{
  const actions=[];
  await assert.rejects(()=>registerProviderCredential({
    vault:{async write(){return {secretReference:"orphan-ref"};},async revoke(reference){actions.push(reference);}},
    repository:{async nextVersion(){return 1;},async savePending(){throw new Error("db offline");}},
    ids:{next:()=>base.credentialId},clock:{now:()=>new Date(base.createdAt)},
  },{providerKey:"openai",secret:"canary-secret",actorId:"operator",requestId:"request"}),/CREDENTIAL_PERSISTENCE_FAILED/);
  assert.deepEqual(actions,["orphan-ref"]);
});

test("credential execution fails closed and never returns the secret",async()=>{
  await assert.rejects(()=>useProviderCredential({
    repository:{async findActive(){return undefined;}},executor:{async execute(){throw new Error("must not run");}},
  },{providerKey:"openai",requestId:"request"},async()=>({ok:true})),/CREDENTIAL_UNAVAILABLE/);
  await assert.rejects(()=>useProviderCredential({
    repository:{async findActive(){return {...base,state:"ACTIVE",activatedAt:base.createdAt};}},executor:{async execute(_ref,operation){return operation("canary-secret");}},
  },{providerKey:"openai",requestId:"request"},async(secret)=>secret),/CREDENTIAL_OUTPUT_REJECTED/);
});

test("testing records only a redacted outcome and revocation blocks before Vault cleanup",async()=>{
  const events=[];
  const passed=await testProviderCredential({tester:{async test(){return {ok:true};}},repository:{async recordTest(input){events.push(input);}}},{...base,actorId:"operator",requestId:"request"});
  assert.deepEqual(passed,{ok:true});
  assert.equal(JSON.stringify(events).includes("canary"),false);
  await assert.rejects(()=>revokeProviderCredential({repository:{async revokeActive(){events.push("db-revoked");return {...base,state:"REVOKED",revokedAt:base.createdAt};}},vault:{async revoke(){events.push("vault-cleanup");throw new Error("offline");}}},{providerKey:"openai",actorId:"operator",requestId:"request"}),/CREDENTIAL_CLEANUP_REQUIRED/);
  assert.deepEqual(events.slice(-2),["db-revoked","vault-cleanup"]);
});
