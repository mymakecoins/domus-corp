import { readFileSync } from "node:fs";

export type RuntimeConfig = Readonly<{
  environment: "dev" | "test" | "staging" | "prod";
  appVersion: string;
  providerApiKey?: string;
}>;

function secretResolver(name: string, env: NodeJS.ProcessEnv): () => string | undefined {
  const runtimeValue = env[name];
  const reference = env[`${name}_FILE`];
  if (runtimeValue !== undefined && reference !== undefined) {
    throw new Error(`${name} and ${name}_FILE are mutually exclusive`);
  }
  return () => {
    const value = reference ? readFileSync(reference, "utf8").trim() : runtimeValue?.trim();
    if (value === "") throw new Error(`${reference ? `${name}_FILE` : name} is empty`);
    return value;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = env.DOMUS_ENV ?? "dev";
  if (!["dev", "test", "staging", "prod"].includes(environment)) {
    throw new Error(`unsupported DOMUS_ENV: ${environment}`);
  }
  const providerApiKey = secretResolver("PROVIDER_API_KEY", env);
  return {
    environment: environment as RuntimeConfig["environment"],
    appVersion: env.APP_VERSION ?? "dev",
    get providerApiKey() {
      return providerApiKey();
    },
  };
}
