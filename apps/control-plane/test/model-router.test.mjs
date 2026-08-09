import assert from "node:assert/strict";
import {test} from "node:test";
import {estimateMaximumCost,routeModel} from "../dist/domain/catalog/model-router.js";

const candidate=(overrides={})=>({modelKey:"model-a",providerKey:"provider-a",catalogVersion:1,priceVersion:1,state:"ACTIVE",providerState:"ACTIVE",capabilities:["CHAT","STREAMING"],maximumClassification:"confidential",contextWindowTokens:10000,maximumOutputTokens:2000,currency:"BRL",inputMinorPerMillionTokens:100,outputMinorPerMillionTokens:300,routePriority:100,fallbackModelKeys:[],...overrides});
const request={requestId:"request",tenantId:"tenant",workspaceId:"workspace",policyVersion:"policy",classification:"internal",allowedClassifications:["public","internal"],allowedModels:["model-a","model-b"],requiredCapabilities:["CHAT"],inputTokens:1000,maximumOutputTokens:500,budget:{currency:"BRL",maximumCostMinor:10}};

test("cost uses integer arithmetic and rounds upward",()=>assert.equal(estimateMaximumCost(candidate(),1000,500),1));

test("routing filters every authority and orders priority, cost, then stable key",async()=>{
  const result=await routeModel({credential:{async isActive(){return true;}},health:{async isEligible(){return true;}}},request,[candidate({modelKey:"model-b",routePriority:100,inputMinorPerMillionTokens:200}),candidate()]);
  assert.equal(result.decision,"ALLOW");assert.equal(result.modelKey,"model-a");
});

test("client cannot reopen policy and missing dependencies fail closed",async()=>{
  const denied=await routeModel({credential:{async isActive(){return true;}},health:{async isEligible(){return true;}}},{...request,allowedModels:[],modelKey:"model-a"},[candidate()]);
  assert.equal(denied.decision,"DENY");assert.ok(denied.denyReasons.includes("MODEL_NOT_AUTHORIZED"));
  const unavailable=await routeModel({credential:{async isActive(){throw new Error("offline");}},health:{async isEligible(){return true;}}},request,[candidate()]);
  assert.equal(unavailable.decision,"DENY");assert.ok(unavailable.denyReasons.includes("ROUTING_DEPENDENCY_UNAVAILABLE"));
});

test("fallback is explicit, bounded and fully revalidated",async()=>{
  const primary=candidate({state:"DISABLED",fallbackModelKeys:["model-b"]});
  const fallback=candidate({modelKey:"model-b",providerKey:"provider-b",routePriority:200});
  const result=await routeModel({credential:{async isActive(){return true;}},health:{async isEligible(){return true;}}},request,[primary,fallback],"model-a");
  assert.equal(result.modelKey,"model-b");assert.deepEqual(result.fallbackChain,["model-a","model-b"]);
  const cycle=await routeModel({credential:{async isActive(){return true;}},health:{async isEligible(){return true;}}},request,[primary,{...fallback,state:"DISABLED",fallbackModelKeys:["model-a"]}],"model-a");
  assert.equal(cycle.decision,"DENY");assert.ok(cycle.denyReasons.includes("FALLBACK_INVALID"));
});

test("fallback tries published alternatives in order",async()=>{
  const primary=candidate({state:"DISABLED",fallbackModelKeys:["model-unhealthy","model-b"]});
  const unhealthy=candidate({modelKey:"model-unhealthy",providerKey:"provider-x",fallbackModelKeys:[]});
  const fallback=candidate({modelKey:"model-b",providerKey:"provider-b",fallbackModelKeys:[]});
  const result=await routeModel({credential:{async isActive(){return true;}},health:{async isEligible(_provider,model){return model!=="model-unhealthy";}}},request,[primary,unhealthy,fallback],"model-a");
  assert.equal(result.modelKey,"model-b");assert.deepEqual(result.fallbackChain,["model-a","model-b"]);
});
