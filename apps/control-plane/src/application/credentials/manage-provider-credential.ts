import {activateCredential, createPendingCredential, type ProviderCredential} from "../../domain/credentials/provider-credential.js";

type Registration = Readonly<{providerKey: string; secret: string; actorId: string; requestId: string}>;
type VaultWriter = {write(input: Readonly<{credentialId: string; providerKey: string; version: number; secret: string}>): Promise<{secretReference: string}>;revoke(reference:string):Promise<void>};
type Repository = {
  nextVersion(providerKey: string): Promise<number>;
  savePending(credential: ProviderCredential, audit?: Readonly<{actorId: string; requestId: string}>): Promise<void>;
};
type Foundation = Readonly<{vault: VaultWriter; repository: Repository; ids: {next(): string}; clock: {now(): Date}}>;

export async function registerProviderCredential(dependencies: Foundation, command: Registration): Promise<ProviderCredential> {
  if (!command.secret.trim()) throw new Error("CREDENTIAL_INVALID");
  const version=await dependencies.repository.nextVersion(command.providerKey);
  const credentialId=dependencies.ids.next();
  const stored=await dependencies.vault.write({credentialId,providerKey:command.providerKey,version,secret:command.secret});
  const credential=createPendingCredential({credentialId,providerKey:command.providerKey,version,state:"PENDING",secretReference:stored.secretReference,createdAt:dependencies.clock.now().toISOString()});
  try{await dependencies.repository.savePending(credential,{actorId:command.actorId,requestId:command.requestId});}
  catch{
    try{await dependencies.vault.revoke(credential.secretReference);}catch{throw new Error("CREDENTIAL_CLEANUP_REQUIRED");}
    throw new Error("CREDENTIAL_PERSISTENCE_FAILED");
  }
  return credential;
}

export async function rotateProviderCredential(
  dependencies: Foundation & Readonly<{
    vault: VaultWriter;
    tester: {test(reference: string): Promise<{ok: boolean}>};
    repository: Repository & {activateReplacing(credential: ProviderCredential, audit?: Readonly<{actorId: string; requestId: string}>): Promise<ProviderCredential>;recordCleanupRequired?(credential:ProviderCredential,context:Readonly<{actorId:string;requestId:string}>):Promise<void>};
  }>,
  command: Registration & Readonly<{previousSecretReference?: string}>,
): Promise<ProviderCredential> {
  const pending=await registerProviderCredential(dependencies,command);
  let result: {ok: boolean};
  try { result=await dependencies.tester.test(pending.secretReference); }
  catch { throw new Error("CREDENTIAL_TEST_UNAVAILABLE"); }
  if (!result.ok) throw new Error("CREDENTIAL_TEST_FAILED");
  const active=activateCredential(pending,{testedVersion:pending.version,activatedAt:dependencies.clock.now().toISOString()});
  const replaced=await dependencies.repository.activateReplacing(active,{actorId:command.actorId,requestId:command.requestId});
  if(command.previousSecretReference){
    try { await dependencies.vault.revoke(command.previousSecretReference); }
    catch { await dependencies.repository.recordCleanupRequired?.(replaced,command);throw new Error("CREDENTIAL_CLEANUP_REQUIRED"); }
  }
  return replaced;
}

export async function testProviderCredential(
  dependencies: Readonly<{
    tester:{test(reference:string):Promise<{ok:boolean}>};
    repository:{recordTest(input:Readonly<{credentialId:string;version:number;ok:boolean;actorId:string;requestId:string}>):Promise<void>};
  }>,
  command: ProviderCredential & Readonly<{actorId:string;requestId:string}>,
):Promise<{ok:boolean}>{
  if(command.state!=="PENDING")throw new Error("CREDENTIAL_STATE_INVALID");
  let result:{ok:boolean};
  try{result=await dependencies.tester.test(command.secretReference);}catch{result={ok:false};}
  await dependencies.repository.recordTest({credentialId:command.credentialId,version:command.version,ok:result.ok,actorId:command.actorId,requestId:command.requestId});
  if(!result.ok)throw new Error("CREDENTIAL_TEST_FAILED");
  return result;
}

export async function revokeProviderCredential(
  dependencies:Readonly<{
    repository:{revokeActive(input:Readonly<{providerKey:string;actorId:string;requestId:string}>):Promise<ProviderCredential>;recordCleanupRequired?(credential:ProviderCredential,context:Readonly<{actorId:string;requestId:string}>):Promise<void>};
    vault:{revoke(reference:string):Promise<void>};
  }>,
  command:Readonly<{providerKey:string;actorId:string;requestId:string}>,
):Promise<ProviderCredential>{
  const revoked=await dependencies.repository.revokeActive(command);
  try{await dependencies.vault.revoke(revoked.secretReference);}catch{
    await dependencies.repository.recordCleanupRequired?.(revoked,command);
    throw new Error("CREDENTIAL_CLEANUP_REQUIRED");
  }
  return revoked;
}

function containsSecret(value: unknown, secret: string): boolean {
  if (typeof value === "string") return value.includes(secret);
  try { return JSON.stringify(value).includes(secret); } catch { return true; }
}

export async function useProviderCredential<Result>(
  dependencies: Readonly<{
    repository: {findActive(providerKey: string): Promise<ProviderCredential | undefined>};
    executor: {execute<T>(reference: string, operation: (secret: string) => Promise<T>): Promise<T>};
  }>,
  context: Readonly<{providerKey: string; requestId: string}>,
  operation: (secret: string) => Promise<Result>,
): Promise<Result> {
  let credential: ProviderCredential | undefined;
  try { credential=await dependencies.repository.findActive(context.providerKey); }
  catch { throw new Error("CREDENTIAL_UNAVAILABLE"); }
  if (!credential || credential.state !== "ACTIVE") throw new Error("CREDENTIAL_UNAVAILABLE");
  try {
    return await dependencies.executor.execute(credential.secretReference,async(secret)=>{
      const result=await operation(secret);
      if (containsSecret(result,secret)) throw new Error("CREDENTIAL_OUTPUT_REJECTED");
      return result;
    });
  } catch(error) {
    if (String(error).includes("CREDENTIAL_OUTPUT_REJECTED")) throw error;
    throw new Error("CREDENTIAL_UNAVAILABLE");
  }
}
