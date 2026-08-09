import assert from "node:assert/strict";
import Fastify from "fastify";
import {test} from "node:test";
import {registerPolicyRoutes} from "../dist/interfaces/http/policy/routes.js";

const context={tenantId:"22222222-2222-4222-8222-222222222222",workspaceId:"33333333-3333-4333-8333-333333333333",userId:"55555555-5555-4555-8555-555555555555",deviceId:"20202020-2020-4020-8020-202020202020",sessionId:"10101010-1010-4010-8010-101010101010",requestId:"11111111-1111-4111-8111-111111111111"};
const policy={...context,policyVersion:"v1",allowedSources:[],allowedAssets:[],allowedModels:["model-a"],allowedTools:[],allowedActions:[],allowedClassifications:["internal"],retentionRules:{maxDays:30},freshnessRules:{maxAgeSeconds:3600},insightRules:{allowed:false},budgetScope:{scopeId:context.workspaceId,currency:"BRL",limitMinor:1000,remainingMinor:800},decision:"ALLOW",denyReasons:[],provenance:[{scope:"global",policyId:"g",version:1}],evaluatedAt:"2026-08-08T12:00:00Z",expiresAt:"2026-08-08T12:05:00Z"};

test("ignores client-declared permissions and resolves server-side policy",async()=>{
  let resolved;
  const app=Fastify({logger:false});
  registerPolicyRoutes(app,{authorizePolicyRequest:async()=>context,resolveEffectivePolicy:async(value)=>{resolved=value;return policy;}});
  const result=await app.inject({method:"POST",url:"/v1/policy/effective",payload:{tenant_id:"attacker",allowed_models:["forbidden"]}});
  assert.equal(result.statusCode,200);assert.equal(resolved.tenantId,context.tenantId);assert.deepEqual(result.json().allowed_models,["model-a"]);
});

test("maps policy dependency failure to fail-closed 503",async()=>{
  const app=Fastify({logger:false});
  registerPolicyRoutes(app,{authorizePolicyRequest:async()=>context,resolveEffectivePolicy:async()=>{throw new Error("POLICY_DEPENDENCY_UNAVAILABLE");}});
  const result=await app.inject({method:"POST",url:"/v1/policy/effective"});
  assert.equal(result.statusCode,503);
});
