import {calculateJwkThumbprint, compactVerify, importJWK, type JWK} from "jose";

import type {DeviceChallengeBinding} from "../../application/identity/issue-device-challenge.js";

type ProofInput = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  nonce: string;
  audience: string;
  publicKeyJwk: JWK;
  proof: string;
}>;

type ProofClaims = DeviceChallengeBinding & Readonly<{iat: number; exp: number; jti: string}>;

const CLOCK_SKEW_SECONDS = 60;
const MAX_PROOF_AGE_SECONDS = 120;

function sameBinding(claims: DeviceChallengeBinding, expected: DeviceChallengeBinding): boolean {
  return claims.tenantId === expected.tenantId && claims.userId === expected.userId &&
    claims.deviceId === expected.deviceId && claims.nonce === expected.nonce &&
    claims.audience === expected.audience && claims.purpose === expected.purpose &&
    claims.expiresAt === expected.expiresAt;
}

export function createDeviceProofVerifier(dependencies: Readonly<{
  store: {
    peek(nonce: string): Promise<DeviceChallengeBinding | undefined>;
    consume(nonce: string): Promise<DeviceChallengeBinding | undefined>;
  };
  now: () => Date;
}>) {
  return Object.freeze({
    async verify(input: ProofInput): Promise<{publicKeyThumbprint: string}> {
      try {
        if (input.publicKeyJwk.kty !== "EC" || input.publicKeyJwk.crv !== "P-256" || input.publicKeyJwk.d !== undefined) {
          throw new Error("unsupported key");
        }
        const expected = await dependencies.store.peek(input.nonce);
        if (!expected || input.tenantId !== expected.tenantId || input.userId !== expected.userId ||
            input.deviceId !== expected.deviceId || input.nonce !== expected.nonce ||
            input.audience !== expected.audience) throw new Error("missing challenge");

        const key = await importJWK(input.publicKeyJwk, "ES256");
        const verified = await compactVerify(input.proof, key, {algorithms: ["ES256"]});
        if (verified.protectedHeader.typ !== "domus-device-proof+jwt") throw new Error("invalid type");
        const claims = JSON.parse(new TextDecoder().decode(verified.payload)) as Partial<ProofClaims>;
        if (
          typeof claims.iat !== "number" || typeof claims.exp !== "number" || typeof claims.jti !== "string" ||
          claims.jti.length === 0 || !sameBinding(claims as ProofClaims, expected)
        ) throw new Error("invalid claims");

        const now = Math.floor(dependencies.now().getTime() / 1000);
        if (claims.iat > now + CLOCK_SKEW_SECONDS || claims.exp < now - CLOCK_SKEW_SECONDS ||
            claims.exp - claims.iat > MAX_PROOF_AGE_SECONDS ||
            Math.floor(Date.parse(expected.expiresAt) / 1000) !== claims.exp) throw new Error("invalid proof time");

        const consumed = await dependencies.store.consume(input.nonce);
        if (!consumed || !sameBinding(claims as ProofClaims, consumed)) throw new Error("replayed challenge");
        return {publicKeyThumbprint: `sha256:${await calculateJwkThumbprint(input.publicKeyJwk, "sha256")}`};
      } catch (error) {
        if (String(error).includes("IDENTITY_DEPENDENCY_UNAVAILABLE")) throw error;
        throw new Error("DEVICE_PROOF_INVALID");
      }
    },
  });
}
