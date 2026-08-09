import assert from "node:assert/strict";import {test} from "node:test";
import {publishModel} from "../dist/application/catalog/publish-model.js";
const model={modelKey:"model-a",providerKey:"provider-a",catalogVersion:1,priceVersion:1,capabilities:["CHAT"],maximumClassification:"confidential",contextWindowTokens:10000,maximumOutputTokens:1000,currency:"BRL",inputMinorPerMillionTokens:100,outputMinorPerMillionTokens:200,routePriority:100,fallbackModelKeys:["model-b"],owner:"product",justification:"synthetic"};
test("publication requires active provider credential and persists no client authority",async()=>{
 const saved=[];await publishModel({credential:{async isActive(){return true;}},catalog:{async isProviderActive(){return true;},async loadFallbackGraph(){return new Map([["model-b",[]]]);},async publish(value){saved.push(value);}}},{...model,actorId:"operator",requestId:"request"});
 assert.equal(saved[0].status,"ACTIVE");assert.equal("clientSelected" in saved[0],false);
 await assert.rejects(()=>publishModel({credential:{async isActive(){return false;}},catalog:{async isProviderActive(){return true;},async loadFallbackGraph(){return new Map();},async publish(){}}},{...model,actorId:"operator",requestId:"request"}),/PROVIDER_CREDENTIAL_UNAVAILABLE/);
});
test("publication rejects cycles and more than three fallbacks",async()=>{
 const deps={credential:{async isActive(){return true;}},catalog:{async isProviderActive(){return true;},async loadFallbackGraph(){return new Map([["model-b",["model-a"]]]);},async publish(){}}};
 await assert.rejects(()=>publishModel(deps,{...model,actorId:"operator",requestId:"request"}),/FALLBACK_INVALID/);
 await assert.rejects(()=>publishModel({...deps,catalog:{...deps.catalog,async loadFallbackGraph(){return new Map();}}},{...model,fallbackModelKeys:["a-a","b-b","c-c","d-d"],actorId:"operator",requestId:"request"}),/FALLBACK_INVALID/);
});
