import assert from "node:assert/strict";
import {test} from "node:test";
import {createVaultCredentialAdapter} from "../dist/infrastructure/vault/provider-credential-vault.js";

test("Vault adapter uses KV v2, runtime workload token and redacted failures",async()=>{
  const requests=[];
  const adapter=createVaultCredentialAdapter({baseUrl:"http://vault.test",mount:"secret",workloadToken:()=>"workload-canary",fetch:async(url,init)=>{
    requests.push({url,init});
    return new Response(JSON.stringify({data:{data:{value:"provider-canary"}}}),{status:200});
  }});
  const result=await adapter.execute("provider-credentials/id/versions/1",async(secret)=>({length:secret.length}));
  assert.deepEqual(result,{length:15});
  assert.match(requests[0].url,/\/v1\/secret\/data\/provider-credentials/);
  assert.equal(requests[0].init.headers["X-Vault-Token"],"workload-canary");
  await assert.rejects(()=>adapter.execute("../escape",async()=>true),error=>!String(error).includes("workload-canary"));
});
