import type {DeviceChallengeBinding} from "../../application/identity/issue-device-challenge.js";

type RedisChallengeClient = Readonly<{
  set(key: string, value: string, options: {NX: true; EX: number}): Promise<string | null>;
  get(key: string): Promise<string | null>;
  getDel(key: string): Promise<string | null>;
}>;

function key(nonce: string): string {
  return `domus:device-challenge:${nonce}`;
}

function decode(value: string | null): DeviceChallengeBinding | undefined {
  if (value === null) return undefined;
  const parsed = JSON.parse(value) as Partial<DeviceChallengeBinding>;
  if (
    typeof parsed.tenantId !== "string" || typeof parsed.userId !== "string" ||
    typeof parsed.deviceId !== "string" || typeof parsed.nonce !== "string" ||
    typeof parsed.audience !== "string" || parsed.purpose !== "device-registration" ||
    typeof parsed.expiresAt !== "string"
  ) throw new Error("invalid challenge state");
  return parsed as DeviceChallengeBinding;
}

export function createDeviceChallengeStore(client: RedisChallengeClient) {
  return Object.freeze({
    async save(binding: DeviceChallengeBinding, ttlSeconds: number): Promise<void> {
      try {
        const result = await client.set(key(binding.nonce), JSON.stringify(binding), {NX: true, EX: ttlSeconds});
        if (result !== "OK") throw new Error("challenge collision");
      } catch {
        throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
      }
    },
    async peek(nonce: string): Promise<DeviceChallengeBinding | undefined> {
      try {
        return decode(await client.get(key(nonce)));
      } catch {
        throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
      }
    },
    async consume(nonce: string): Promise<DeviceChallengeBinding | undefined> {
      try {
        return decode(await client.getDel(key(nonce)));
      } catch {
        throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
      }
    },
  });
}
