import assert from "node:assert/strict";
import {test} from "node:test";

import {createPolicyCache} from "../dist/infrastructure/redis/policy-cache.js";

const context={tenantId:"22222222-2222-4222-8222-222222222222",workspaceId:"33333333-3333-4333-8333-333333333333",userId:"55555555-5555-4555-8555-555555555555",deviceId:"20202020-2020-4020-8020-202020202020",sessionId:"10101010-1010-4010-8010-101010101010",requestId:"11111111-1111-4111-8111-111111111111"};
const policy={...context,policyVersion:"global:g:1|tenant:t:1|workspace:w:1|role:r:1",allowedSources:[],allowedAssets:[],allowedModels:["model-a"],allowedTools:[],allowedActions:[],allowedClassifications:["internal"],retentionRules:{maxDays:30},freshnessRules:{maxAgeSeconds:3600},insightRules:{allowed:false},budgetScope:{scopeId:context.workspaceId,currency:"BRL",limitMinor:1000,remainingMinor:800},decision:"ALLOW",denyReasons:[],provenance:[{scope:"global",policyId:"g",version:1}],evaluatedAt:"2026-08-08T12:00:00Z",expiresAt:"2026-08-08T12:05:00Z"};

test("stores effective policy for at most five minutes and validates version",async()=>{
  const values=new Map(); let options;
  const cache=createPolicyCache({get:async(key)=>values.get(key)??null,set:async(key,value,given)=>{values.set(key,value);options=given;return "OK";}});
  await cache.publish(policy);
  assert.deepEqual(options,{EX:300});
  assert.equal((await cache.get(context,policy.policyVersion)).allowedModels[0],"model-a");
  assert.equal(await cache.get(context,"other-version"),undefined);
});

test("fails closed on malformed or unavailable cache state",async()=>{
  const cache=createPolicyCache({get:async()=>"bad-json",set:async()=>"OK"});
  await assert.rejects(cache.get(context,policy.policyVersion),/POLICY_DEPENDENCY_UNAVAILABLE/);
  await assert.rejects(createPolicyCache({get:async()=>{throw new Error("down");},set:async()=>"OK"}).get(context,policy.policyVersion),/POLICY_DEPENDENCY_UNAVAILABLE/);
});
