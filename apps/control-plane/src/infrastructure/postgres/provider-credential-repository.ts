import {randomUUID} from "node:crypto";
import type {ProviderCredential} from "../../domain/credentials/provider-credential.js";

type Result<Row>={rows:Row[]};
type Client={query<Row=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<Result<Row>>;release():void};
type Pool={connect():Promise<Client>};
type Utilities=Readonly<{next():string;now():Date}>;

function map(row:{credential_id:string;provider_key:string;version:number;state:string;secret_reference:string;created_at:Date;activated_at?:Date|null;revoked_at?:Date|null}):ProviderCredential{
  return Object.freeze({credentialId:row.credential_id,providerKey:row.provider_key,version:Number(row.version),state:row.state.toUpperCase() as ProviderCredential["state"],secretReference:row.secret_reference,createdAt:row.created_at.toISOString(),...(row.activated_at?{activatedAt:row.activated_at.toISOString()}:{}),...(row.revoked_at?{revokedAt:row.revoked_at.toISOString()}:{})});
}

export function createPostgresCredentialRepository(pool:Pool,utilities:Utilities={next:randomUUID,now:()=>new Date()}){
  const transaction=async<Result>(work:(client:Client)=>Promise<Result>):Promise<Result>=>{
    const client=await pool.connect();
    try{await client.query("BEGIN");const result=await work(client);await client.query("COMMIT");return result;}
    catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  };
  const audit=async(client:Client,credential:ProviderCredential,context:{actorId:string;requestId:string},action:string)=>{
    await client.query(`INSERT INTO provider_credential_audit
      (audit_id,credential_id,request_id,actor_id,action,result,credential_version,occurred_at)
      VALUES ($1,$2,$3,$4,$5,'succeeded',$6,$7)`,[utilities.next(),credential.credentialId,context.requestId,context.actorId,action,credential.version,utilities.now().toISOString()]);
  };
  return Object.freeze({
    async nextVersion(providerKey:string):Promise<number>{
      const client=await pool.connect();try{const result=await client.query<{next_version:number}>("SELECT coalesce(max(version),0)+1 AS next_version FROM provider_credential_binding WHERE provider_key=$1",[providerKey]);return Number(result.rows[0]?.next_version??1);}finally{client.release();}
    },
    async savePending(credential:ProviderCredential,context:{actorId:string;requestId:string}):Promise<void>{
      await transaction(async client=>{await client.query(`INSERT INTO provider_credential_binding
        (credential_id,provider_key,version,state,secret_reference,created_at,created_by)
        VALUES ($1,$2,$3,'pending',$4,$5,$6)`,[credential.credentialId,credential.providerKey,credential.version,credential.secretReference,credential.createdAt,context.actorId]);await audit(client,credential,context,"registered");});
    },
    async activateReplacing(credential:ProviderCredential,context:{actorId:string;requestId:string}):Promise<ProviderCredential>{
      return transaction(async client=>{
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[credential.providerKey]);
        await client.query("UPDATE provider_credential_binding SET state = 'revoked', revoked_at=$2 WHERE provider_key=$1 AND state='active'",[credential.providerKey,credential.activatedAt]);
        const result=await client.query<{credential_id:string;provider_key:string;version:number;state:string;secret_reference:string;created_at:Date;activated_at:Date}>(`UPDATE provider_credential_binding SET state='active',activated_at=$2,last_tested_at=$2,last_test_result='passed'
          WHERE credential_id=$1 AND version=$3 AND state='pending' RETURNING *`,[credential.credentialId,credential.activatedAt,credential.version]);
        const active=result.rows[0];if(!active)throw new Error("CREDENTIAL_STATE_INVALID");
        const mapped=map(active);await audit(client,mapped,context,"rotated");return mapped;
      });
    },
    async findActive(providerKey:string):Promise<ProviderCredential|undefined>{
      const client=await pool.connect();try{const result=await client.query<{credential_id:string;provider_key:string;version:number;state:string;secret_reference:string;created_at:Date;activated_at:Date}>("SELECT * FROM provider_credential_binding WHERE provider_key=$1 AND state='active'",[providerKey]);return result.rows[0]?map(result.rows[0]):undefined;}finally{client.release();}
    },
    async recordTest(input:{credentialId:string;version:number;ok:boolean;actorId:string;requestId:string}):Promise<void>{
      await transaction(async client=>{
        const result=await client.query<{credential_id:string;provider_key:string;version:number;state:string;secret_reference:string;created_at:Date}>(`UPDATE provider_credential_binding SET last_tested_at=$3,last_test_result=$4
          WHERE credential_id=$1 AND version=$2 AND state='pending' RETURNING *`,[input.credentialId,input.version,utilities.now().toISOString(),input.ok?"passed":"failed"]);
        if(!result.rows[0])throw new Error("CREDENTIAL_STATE_INVALID");
        await audit(client,map(result.rows[0]),input,"tested");
      });
    },
    async revokeActive(input:{providerKey:string;actorId:string;requestId:string}):Promise<ProviderCredential>{
      return transaction(async client=>{
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[input.providerKey]);
        const result=await client.query<{credential_id:string;provider_key:string;version:number;state:string;secret_reference:string;created_at:Date;activated_at:Date;revoked_at:Date}>(`UPDATE provider_credential_binding SET state='revoked',revoked_at=$2
          WHERE provider_key=$1 AND state='active' RETURNING *`,[input.providerKey,utilities.now().toISOString()]);
        if(!result.rows[0])throw new Error("CREDENTIAL_UNAVAILABLE");
        const revoked=map(result.rows[0]);await audit(client,revoked,input,"revoked");return revoked;
      });
    },
    async recordCleanupRequired(credential:ProviderCredential,context:{actorId:string;requestId:string}):Promise<void>{
      await transaction(client=>audit(client,credential,context,"cleanup_required"));
    },
  });
}
