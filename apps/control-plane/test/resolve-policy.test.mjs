import assert from "node:assert/strict";
import {test} from "node:test";

import {resolveEffectivePolicy} from "../dist/application/policy/resolve-effective-policy.js";

const context = {tenantId:"22222222-2222-4222-8222-222222222222",workspaceId:"33333333-3333-4333-8333-333333333333",userId:"55555555-5555-4555-8555-555555555555",deviceId:"20202020-2020-4020-8020-202020202020",sessionId:"10101010-1010-4010-8010-101010101010",requestId:"11111111-1111-4111-8111-111111111111"};
const base={allowedSources:["source-a"],allowedAssets:["asset-a"],allowedModels:["model-a"],allowedTools:["tool-a"],allowedActions:["action-a"],allowedClassifications:["internal"],retentionMaxDays:30,freshnessMaxAgeSeconds:3600,insightsAllowed:true,budget:{currency:"BRL",limitMinor:1000,remainingMinor:800}};
const layers=["global","tenant","workspace","role"].map((scope)=>({scope,policyId:`${scope}-policy`,version:1,...base}));

function dependencies(overrides={}) {
  return {
    security:{assertCurrent:async()=>undefined},
    policies:{loadPublished:async()=>layers},
    cache:{get:async()=>undefined,publish:async()=>undefined},
    audit:{record:async()=>undefined},
    clock:{now:()=>new Date("2026-08-08T12:00:00Z")},
    ...overrides,
  };
}

test("recalculates policy from server-side layers and publishes a versioned cache entry",async()=>{
  let published; let audited;
  const policy=await resolveEffectivePolicy(dependencies({cache:{get:async()=>undefined,publish:async(value)=>{published=value;}},audit:{record:async(value)=>{audited=value;}}}),context);
  assert.equal(policy.decision,"ALLOW");
  assert.equal(published.policyVersion,policy.policyVersion);
  assert.equal(audited.decision,"ALLOW");
});

test("uses only a cache entry matching computed version and security context",async()=>{
  let publishes=0;
  const first=await resolveEffectivePolicy(dependencies(),context);
  const second=await resolveEffectivePolicy(dependencies({cache:{get:async()=>first,publish:async()=>{publishes+=1;}}}),context);
  assert.equal(second,first);
  assert.equal(publishes,0);
});

test("fails closed when revocation, repository, cache or audit is unavailable",async()=>{
  for (const failing of [
    {security:{assertCurrent:async()=>{throw new Error("DEVICE_REVOKED");}}},
    {policies:{loadPublished:async()=>{throw new Error("database down");}}},
    {cache:{get:async()=>{throw new Error("bad cache");},publish:async()=>{}}},
    {audit:{record:async()=>{throw new Error("audit down");}}},
  ]) {
    await assert.rejects(resolveEffectivePolicy(dependencies(failing),context),/POLICY_(DENIED|DEPENDENCY_UNAVAILABLE)/);
  }
});
