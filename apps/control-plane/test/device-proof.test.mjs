import assert from "node:assert/strict";
import { test } from "node:test";
import { CompactSign, exportJWK, generateKeyPair } from "jose";

import { createDeviceProofVerifier } from "../dist/infrastructure/identity/device-proof-verifier.js";

const binding = {
  tenantId: "22222222-2222-4222-8222-222222222222",
  userId: "55555555-5555-4555-8555-555555555555",
  deviceId: "20202020-2020-4020-8020-202020202020",
  nonce: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
  audience: "domus-device-registration",
  purpose: "device-registration",
  expiresAt: "2026-08-08T12:02:00.000Z",
};
const {privateKey, publicKey} = await generateKeyPair("ES256", {extractable: true});
const publicKeyJwk = await exportJWK(publicKey);

async function proof(overrides = {}) {
  const payload = {...binding, iat: 1786190400, exp: 1786190520, jti: "proof-jti", ...overrides};
  return new CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader({alg: "ES256", typ: "domus-device-proof+jwt"})
    .sign(privateKey);
}

function fixture() {
  let consumed = false;
  return {
    store: {
      peek: async () => consumed ? undefined : binding,
      consume: async () => {
        if (consumed) return undefined;
        consumed = true;
        return binding;
      },
    },
    now: () => new Date("2026-08-08T12:00:30Z"),
  };
}

test("verifies ES256 device proof and derives the RFC 7638 thumbprint", async () => {
  const dependencies = fixture();
  const verifier = createDeviceProofVerifier(dependencies);
  const result = await verifier.verify({...binding, publicKeyJwk, proof: await proof()});
  assert.match(result.publicKeyThumbprint, /^sha256:[A-Za-z0-9_-]{43}$/);
});

test("rejects replay after consuming a valid challenge", async () => {
  const dependencies = fixture();
  const verifier = createDeviceProofVerifier(dependencies);
  const signed = await proof();
  await verifier.verify({...binding, publicKeyJwk, proof: signed});
  await assert.rejects(verifier.verify({...binding, publicKeyJwk, proof: signed}), /DEVICE_PROOF_INVALID/);
});

test("rejects invalid binding, algorithm, or expired proof without leaking material", async () => {
  const wrongDevice = await proof({deviceId: "21212121-2121-4121-8121-212121212121"});
  await assert.rejects(createDeviceProofVerifier(fixture()).verify({...binding, publicKeyJwk, proof: wrongDevice}), /DEVICE_PROOF_INVALID/);

  const {privateKey: rsaPrivate, publicKey: rsaPublic} = await generateKeyPair("RS256", {extractable: true});
  const rsaJwk = await exportJWK(rsaPublic);
  const rsaProof = await new CompactSign(new TextEncoder().encode(JSON.stringify({...binding, iat: 1786190400, exp: 1786190520, jti: "rsa"})))
    .setProtectedHeader({alg: "RS256", typ: "domus-device-proof+jwt"}).sign(rsaPrivate);
  await assert.rejects(createDeviceProofVerifier(fixture()).verify({...binding, publicKeyJwk: rsaJwk, proof: rsaProof}), /DEVICE_PROOF_INVALID/);

  await assert.rejects(createDeviceProofVerifier({...fixture(), now: () => new Date("2026-08-08T12:03:01Z")}).verify({...binding, publicKeyJwk, proof: await proof()}), /DEVICE_PROOF_INVALID/);

  const privateJwk = await exportJWK(privateKey);
  await assert.rejects(createDeviceProofVerifier(fixture()).verify({...binding, publicKeyJwk: privateJwk, proof: await proof()}), /DEVICE_PROOF_INVALID/);

  await assert.rejects(createDeviceProofVerifier(fixture()).verify({...binding, publicKeyJwk: {...publicKeyJwk, kid: "client-controlled"}, proof: await proof()}), /DEVICE_PROOF_INVALID/);
});
