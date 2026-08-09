type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Options = Readonly<{
  baseUrl: string;
  mount: string;
  workloadToken(): string;
  fetch?: Fetch;
  connectionTimeoutMs?: number;
  operationTimeoutMs?: number;
}>;

function safePath(reference: string): string {
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(reference) || reference.includes("//") || reference.includes("..")) {
    throw new Error("CREDENTIAL_REFERENCE_INVALID");
  }
  return reference.split("/").map(encodeURIComponent).join("/");
}

export function createVaultCredentialAdapter(options: Options) {
  const request: Fetch=options.fetch??fetch;
  const endpoint=(reference:string)=>`${options.baseUrl.replace(/\/$/,"")}/v1/${encodeURIComponent(options.mount)}/data/${safePath(reference)}`;
  const call=async(reference:string,init:RequestInit):Promise<Response>=>{
    const token=options.workloadToken().trim();
    if (!token) throw new Error("CREDENTIAL_UNAVAILABLE");
    try {
      const response=await request(endpoint(reference),{...init,headers:{"Content-Type":"application/json","X-Vault-Token":token,...init.headers},signal:AbortSignal.timeout(options.connectionTimeoutMs??2000)});
      if (!response.ok) throw new Error("vault rejected request");
      return response;
    } catch { throw new Error("CREDENTIAL_UNAVAILABLE"); }
  };
  const withinOperationTimeout=<Result>(operation:()=>Promise<Result>):Promise<Result>=>new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error("CREDENTIAL_UNAVAILABLE")),options.operationTimeoutMs??5000);
    operation().then(value=>{clearTimeout(timeout);resolve(value);},error=>{clearTimeout(timeout);reject(error);});
  });
  return Object.freeze({
    async write(input: Readonly<{credentialId:string;providerKey:string;version:number;secret:string}>):Promise<{secretReference:string}>{
      const reference=`provider-credentials/${input.credentialId}/versions/${input.version}`;
      await withinOperationTimeout(()=>call(reference,{method:"POST",body:JSON.stringify({data:{value:input.secret,provider_key:input.providerKey,version:input.version}})}));
      return {secretReference:reference};
    },
    async revoke(reference:string):Promise<void>{await withinOperationTimeout(()=>call(reference,{method:"DELETE"}));},
    async execute<Result>(reference:string,operation:(secret:string)=>Promise<Result>):Promise<Result>{
      const response=await withinOperationTimeout(()=>call(reference,{method:"GET"}));
      try {
        const payload=await response.json() as {data?:{data?:{value?:unknown}}};
        const secret=payload.data?.data?.value;
        if (typeof secret!=="string"||!secret) throw new Error("invalid response");
        return await operation(secret);
      } catch(error) {
        if (String(error).includes("CREDENTIAL_OUTPUT_REJECTED")) throw error;
        throw new Error("CREDENTIAL_UNAVAILABLE");
      }
    },
  });
}
