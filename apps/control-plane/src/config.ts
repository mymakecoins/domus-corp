import { readFileSync } from "node:fs";

export type RuntimeConfig = Readonly<{
  environment: "dev" | "test" | "staging" | "prod";
  appVersion: string;
  vault?: Readonly<{address:string;kvMount:string;readonly workloadToken:string}>;
}>;

function fileSecretResolver(name: string, env: NodeJS.ProcessEnv): () => string {
  const reference = env[`${name}_FILE`];
  if (!reference) throw new Error(`${name}_FILE is required`);
  return () => {
    const value = readFileSync(reference, "utf8").trim();
    if (value === "") throw new Error(`${name}_FILE is empty`);
    return value;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = env.DOMUS_ENV ?? "dev";
  if (!["dev", "test", "staging", "prod"].includes(environment)) {
    throw new Error(`unsupported DOMUS_ENV: ${environment}`);
  }
  if (env.PROVIDER_API_KEY !== undefined || env.PROVIDER_API_KEY_FILE !== undefined) {
    throw new Error("raw provider credentials are forbidden; use a Vault reference");
  }
  if (env.VAULT_TOKEN !== undefined) throw new Error("VAULT_TOKEN_FILE is required; raw VAULT_TOKEN is forbidden");
  let vault:RuntimeConfig["vault"];
  if (env.VAULT_ADDR || env.VAULT_TOKEN_FILE) {
    if (!env.VAULT_ADDR) throw new Error("VAULT_ADDR is required");
    const localHttp=/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.VAULT_ADDR);
    if (!env.VAULT_ADDR.startsWith("https://") && !((environment==="dev"||environment==="test")&&localHttp)) {
      throw new Error("VAULT_ADDR must use https outside local development");
    }
    const workloadToken=fileSecretResolver("VAULT_TOKEN",env);
    const kvMount=env.VAULT_KV_MOUNT??"secret";
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(kvMount)) throw new Error("invalid VAULT_KV_MOUNT");
    vault=Object.freeze({address:env.VAULT_ADDR,kvMount,get workloadToken(){return workloadToken();}});
  }
  return {
    environment: environment as RuntimeConfig["environment"],
    appVersion: env.APP_VERSION ?? "dev",
    ...(vault?{vault}:{}),
  };
}
