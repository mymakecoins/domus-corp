import assert from "node:assert/strict";import {test} from "node:test";
import {prepareEgress} from "../dist/domain/security/egress-guard.js";
const context={requestId:"request",tenantId:"tenant",workspaceId:"workspace",policyVersion:"policy",policyDecision:"ALLOW",classification:"internal",allowedClassifications:["public","internal"],providerKey:"provider-a",modelKey:"model-a",routeDecision:"ALLOW",maximumClassification:"confidential",ruleVersion:1};
const rules=[{ruleId:"email",kind:"PII",detector:"EMAIL",action:"MASK"},{ruleId:"cpf",kind:"PII",detector:"CPF",action:"BLOCK"}];

test("masks configured PII without retaining the match",()=>{
 const result=prepareEgress({...context,payload:{message:"contato user@example.test"},rules});
 assert.equal(result.decision,"ALLOW");assert.deepEqual(result.payload,{message:"contato [REDACTED:EMAIL]"});assert.equal(JSON.stringify(result).includes("user@example.test"),false);
});
test("secrets and dangerous keys always deny without leaking canary",()=>{
 for(const payload of [{message:"Bearer secret-canary-token"},{authorization:"secret-canary-token"},{pem:"-----BEGIN PRIVATE KEY-----\nsecret-canary\n-----END PRIVATE KEY-----"}]){
  const result=prepareEgress({...context,payload,rules});assert.equal(result.decision,"DENY");assert.equal(JSON.stringify(result).includes("secret-canary"),false);
 }
});
test("PII exception can only turn block into mask while valid and scoped",()=>{
 const exception={exceptionId:"exception",version:1,tenantId:"tenant",workspaceId:"workspace",providerKey:"provider-a",modelKey:"model-a",piiTypes:["CPF"],owner:"owner",approver:"security",validFrom:"2026-08-09T00:00:00Z",expiresAt:"2026-08-20T00:00:00Z"};
 const result=prepareEgress({...context,payload:{cpf:"123.456.789-00"},rules,exception,now:"2026-08-10T00:00:00Z"});assert.equal(result.decision,"ALLOW");assert.deepEqual(result.payload,{cpf:"[REDACTED:CPF]"});
 const secret=prepareEgress({...context,payload:{value:"Bearer secret-canary-token"},rules,exception,now:"2026-08-10T00:00:00Z"});assert.equal(secret.decision,"DENY");
});
test("invalid authority, custom objects, excessive depth or size fail closed",()=>{
 assert.equal(prepareEgress({...context,policyDecision:"DENY",payload:{ok:true},rules}).decision,"DENY");
 assert.equal(prepareEgress({...context,payload:new Date(),rules}).decision,"DENY");
 let deep={};let cursor=deep;for(let i=0;i<21;i++){cursor.next={};cursor=cursor.next;}assert.equal(prepareEgress({...context,payload:deep,rules}).decision,"DENY");
 assert.equal(prepareEgress({...context,payload:{value:"x".repeat(1024*1024)},rules}).decision,"DENY");
});
