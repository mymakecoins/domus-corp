export type ScopedTokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export type ScopedOAuthToken = Readonly<{
  tokenId: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  providerKey: string;
  accessToken: string;
  refreshToken?: string;
  scopes: readonly string[];
  expiresAt: string;
  status: ScopedTokenStatus;
}>;

export function resolveScopedToken(
  token: ScopedOAuthToken,
  context: Readonly<{
    tenantId: string;
    workspaceId: string;
    userId: string;
    requiredScopes: readonly string[];
  }>
): ScopedOAuthToken {
  if (token.tenantId !== context.tenantId || token.workspaceId !== context.workspaceId || token.userId !== context.userId) {
    throw new Error("CREDENTIAL_TENANT_MISMATCH");
  }
  if (token.status === "REVOKED") {
    throw new Error("CREDENTIAL_REVOKED");
  }
  if (token.status === "EXPIRED" || new Date(token.expiresAt).getTime() <= Date.now()) {
    throw new Error("CREDENTIAL_EXPIRED");
  }
  const missingScopes = context.requiredScopes.filter((s) => !token.scopes.includes(s));
  if (missingScopes.length > 0) {
    throw new Error(`CREDENTIAL_INSUFFICIENT_SCOPES:${missingScopes.join(",")}`);
  }
  return token;
}
