import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

import { createOidcVerifier, createRemoteOidcVerifier } from "../dist/infrastructure/oidc/oidc-verifier.js";

const issuer = "https://idp.example.test";
const audience = "domus-control-plane";
const {privateKey, publicKey} = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = "test-key";
publicJwk.alg = "RS256";
const keySet = createLocalJWKSet({keys: [publicJwk]});

async function token(overrides = {}) {
  const now = Math.floor(Date.parse("2026-08-08T12:00:00Z") / 1000);
  const claims = {
    sub: "synthetic-user",
    tenant: "synthetic-corp",
    groups: ["finance-readers"],
    ...overrides,
  };
  return new SignJWT(claims)
    .setProtectedHeader({alg: "RS256", kid: "test-key"})
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 600)
    .sign(privateKey);
}

function verifier(overrides = {}) {
  return createOidcVerifier({
    issuer,
    audience,
    tenantClaim: "tenant",
    groupsClaim: "groups",
    keySet,
    now: () => new Date("2026-08-08T12:00:30Z"),
    ...overrides,
  });
}

test("validates OIDC claims into an external identity without effective policy", async () => {
  const identity = await verifier().verify(await token());
  assert.equal(identity.subject, "synthetic-user");
  assert.deepEqual(identity.externalTenantHints, ["synthetic-corp"]);
  assert.deepEqual(identity.externalGroups, ["finance-readers"]);
  assert.equal("allowedSources" in identity, false);
});

test("rejects an invalid issuer or audience", async () => {
  await assert.rejects(verifier({issuer: "https://other.example.test"}).verify(await token()), /IDENTITY_ISSUER_INVALID/);
  await assert.rejects(verifier({audience: "other-api"}).verify(await token()), /IDENTITY_AUDIENCE_INVALID/);
});

test("fails closed when mandatory subject or tenant claim is absent", async () => {
  await assert.rejects(verifier().verify(await token({sub: undefined})), /IDENTITY_CLAIM_MISSING/);
  await assert.rejects(verifier().verify(await token({tenant: undefined})), /IDENTITY_CLAIM_MISSING/);
});

test("never exposes the raw token in an error", async () => {
  const secretToken = "sensitive-token-canary";
  await assert.rejects(
    verifier().verify(secretToken),
    (error) => !String(error).includes(secretToken) && /IDENTITY_TOKEN_INVALID/.test(String(error)),
  );
});

test("discovery rejects issuer substitution and insecure JWKS", async () => {
  const base = {issuer, audience, tenantClaim: "tenant", groupsClaim: "groups"};
  await assert.rejects(
    createRemoteOidcVerifier({...base, fetch: async () => new Response(JSON.stringify({
      issuer: "https://attacker.example.test", jwks_uri: "https://idp.example.test/jwks",
    }))}),
    /IDENTITY_ISSUER_INVALID/,
  );
  await assert.rejects(
    createRemoteOidcVerifier({...base, fetch: async () => new Response(JSON.stringify({
      issuer, jwks_uri: "http://idp.example.test/jwks",
    }))}),
    /IDENTITY_DEPENDENCY_UNAVAILABLE/,
  );
});
