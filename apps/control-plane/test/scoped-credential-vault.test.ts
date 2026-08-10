import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ScopedOAuthToken,
  resolveScopedToken,
} from "../dist/domain/credentials/scoped-credential-vault.js";

test("resolveScopedToken returns active token when scopes match", () => {
  const token: ScopedOAuthToken = {
    tokenId: "tok-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    providerKey: "google",
    accessToken: "ya29.secret-token-value",
    scopes: ["read:drive", "write:drive"],
    expiresAt: "2099-01-01T00:00:00.000Z",
    status: "ACTIVE",
  };

  const resolved = resolveScopedToken(token, {
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    requiredScopes: ["read:drive"],
  });

  assert.equal(resolved.accessToken, "ya29.secret-token-value");
});

test("resolveScopedToken throws CREDENTIAL_REVOKED if token status is REVOKED", () => {
  const token: ScopedOAuthToken = {
    tokenId: "tok-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    providerKey: "google",
    accessToken: "ya29.secret-token-value",
    scopes: ["read:drive"],
    expiresAt: "2099-01-01T00:00:00.000Z",
    status: "REVOKED",
  };

  assert.throws(
    () =>
      resolveScopedToken(token, {
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        requiredScopes: ["read:drive"],
      }),
    /CREDENTIAL_REVOKED/
  );
});

test("resolveScopedToken throws CREDENTIAL_TENANT_MISMATCH when tenant, workspace or user mismatch", () => {
  const token: ScopedOAuthToken = {
    tokenId: "tok-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    providerKey: "google",
    accessToken: "ya29.secret-token-value",
    scopes: ["read:drive"],
    expiresAt: "2099-01-01T00:00:00.000Z",
    status: "ACTIVE",
  };

  assert.throws(
    () =>
      resolveScopedToken(token, {
        tenantId: "t-2",
        workspaceId: "w-1",
        userId: "u-1",
        requiredScopes: ["read:drive"],
      }),
    /CREDENTIAL_TENANT_MISMATCH/
  );
});

test("resolveScopedToken throws CREDENTIAL_EXPIRED if expired or status EXPIRED", () => {
  const token: ScopedOAuthToken = {
    tokenId: "tok-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    providerKey: "google",
    accessToken: "ya29.secret-token-value",
    scopes: ["read:drive"],
    expiresAt: "2000-01-01T00:00:00.000Z",
    status: "ACTIVE",
  };

  assert.throws(
    () =>
      resolveScopedToken(token, {
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        requiredScopes: ["read:drive"],
      }),
    /CREDENTIAL_EXPIRED/
  );
});

test("resolveScopedToken throws CREDENTIAL_INSUFFICIENT_SCOPES if required scopes missing", () => {
  const token: ScopedOAuthToken = {
    tokenId: "tok-1",
    tenantId: "t-1",
    workspaceId: "w-1",
    userId: "u-1",
    providerKey: "google",
    accessToken: "ya29.secret-token-value",
    scopes: ["read:drive"],
    expiresAt: "2099-01-01T00:00:00.000Z",
    status: "ACTIVE",
  };

  assert.throws(
    () =>
      resolveScopedToken(token, {
        tenantId: "t-1",
        workspaceId: "w-1",
        userId: "u-1",
        requiredScopes: ["read:drive", "admin:drive"],
      }),
    /CREDENTIAL_INSUFFICIENT_SCOPES:admin:drive/
  );
});
