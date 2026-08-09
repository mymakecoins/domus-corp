import { IdentityDomainError } from "../../domain/identity/identity-errors.js";

type RedisLike = Readonly<{
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}>;

type DeviceCacheState = Readonly<{status: "ACTIVE" | "REVOKED"; version: number}>;

export function createRevocationCache(client: RedisLike) {
  return Object.freeze({
    async assertActive(deviceId: string, expectedVersion: number): Promise<void> {
      try {
        const encoded = await client.get(`domus:device:${deviceId}`);
        if (encoded === null) throw new Error("cache miss");
        const state = JSON.parse(encoded) as Partial<DeviceCacheState>;
        if (state.status === "REVOKED") throw new IdentityDomainError("DEVICE_REVOKED");
        if (state.status !== "ACTIVE" || state.version !== expectedVersion) throw new Error("stale cache");
      } catch (error) {
        if (error instanceof IdentityDomainError) throw error;
        throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
      }
    },
    async publish(deviceId: string, state: DeviceCacheState): Promise<void> {
      try {
        await client.set(`domus:device:${deviceId}`, JSON.stringify(state));
      } catch {
        throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
      }
    },
  });
}
