import { createHash } from "node:crypto";

import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";

import { createExternalIdentity, type ExternalIdentity } from "../../domain/identity/external-identity.js";

export type OidcVerifier = Readonly<{verify(token: string): Promise<ExternalIdentity>}>;

export type OidcVerifierConfig = Readonly<{
  issuer: string;
  audience: string;
  tenantClaim: string;
  groupsClaim: string;
  keySet: JWTVerifyGetKey;
  now?: () => Date;
}>;

export type RemoteOidcConfig = Omit<OidcVerifierConfig, "keySet"> & Readonly<{
  fetch?: typeof globalThis.fetch;
}>;

export class IdentityVerificationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "IdentityVerificationError";
  }
}

function stringsFromClaim(value: unknown, name: string, required: boolean): readonly string[] {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values) || values.some((item) => typeof item !== "string" || item === "")) {
    if (required || value !== undefined) throw new IdentityVerificationError("IDENTITY_CLAIM_MISSING");
    return [];
  }
  if (required && values.length === 0) throw new IdentityVerificationError("IDENTITY_CLAIM_MISSING");
  return values;
}

function mapJoseError(error: unknown): IdentityVerificationError {
  if (error instanceof errors.JWTExpired) return new IdentityVerificationError("IDENTITY_TOKEN_EXPIRED");
  const failedClaim = (error as {claim?: unknown}).claim;
  if (failedClaim === "iss") return new IdentityVerificationError("IDENTITY_ISSUER_INVALID");
  if (failedClaim === "aud") return new IdentityVerificationError("IDENTITY_AUDIENCE_INVALID");
  return new IdentityVerificationError("IDENTITY_TOKEN_INVALID");
}

export function createOidcVerifier(config: OidcVerifierConfig): OidcVerifier {
  if (!config.issuer.startsWith("https://")) throw new Error("OIDC issuer must use HTTPS");
  if (config.audience.trim() === "") throw new Error("OIDC audience is required");

  return Object.freeze({
    async verify(token: string): Promise<ExternalIdentity> {
      try {
        const {payload} = await jwtVerify(token, config.keySet, {
          algorithms: ["RS256", "ES256"],
          issuer: config.issuer,
          audience: config.audience,
          clockTolerance: 60,
          currentDate: config.now?.(),
          maxTokenAge: "10m",
        });
        if (typeof payload.sub !== "string" || payload.sub === "") {
          throw new IdentityVerificationError("IDENTITY_CLAIM_MISSING");
        }
        if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
          throw new IdentityVerificationError("IDENTITY_CLAIM_MISSING");
        }
        const groups = stringsFromClaim(payload[config.groupsClaim], config.groupsClaim, false);
        const tenantHints = stringsFromClaim(payload[config.tenantClaim], config.tenantClaim, true);
        return createExternalIdentity({
          issuer: config.issuer,
          subject: payload.sub,
          audiences: stringsFromClaim(payload.aud, "aud", true),
          issuedAt: new Date(payload.iat * 1000).toISOString(),
          expiresAt: new Date(payload.exp * 1000).toISOString(),
          authTime: typeof payload.auth_time === "number" ? new Date(payload.auth_time * 1000).toISOString() : undefined,
          externalGroups: groups,
          externalTenantHints: tenantHints,
          claimsHash: `sha256:${createHash("sha256").update(token).digest("hex")}`,
        });
      } catch (error) {
        if (error instanceof IdentityVerificationError) throw error;
        throw mapJoseError(error);
      }
    },
  });
}

export async function createRemoteOidcVerifier(config: RemoteOidcConfig): Promise<OidcVerifier> {
  if (!config.issuer.startsWith("https://")) throw new Error("OIDC issuer must use HTTPS");
  const fetcher = config.fetch ?? globalThis.fetch;
  const discoveryUrl = new URL(".well-known/openid-configuration", `${config.issuer.replace(/\/$/, "")}/`);
  const response = await fetcher(discoveryUrl, {headers: {accept: "application/json"}});
  if (!response.ok) throw new IdentityVerificationError("IDENTITY_DEPENDENCY_UNAVAILABLE");
  const metadata = await response.json() as {issuer?: unknown; jwks_uri?: unknown};
  if (metadata.issuer !== config.issuer) throw new IdentityVerificationError("IDENTITY_ISSUER_INVALID");
  if (typeof metadata.jwks_uri !== "string" || !metadata.jwks_uri.startsWith("https://")) {
    throw new IdentityVerificationError("IDENTITY_DEPENDENCY_UNAVAILABLE");
  }
  return createOidcVerifier({
    ...config,
    keySet: createRemoteJWKSet(new URL(metadata.jwks_uri), {
      cacheMaxAge: 5 * 60 * 1000,
      cooldownDuration: 30 * 1000,
      timeoutDuration: 5 * 1000,
    }),
  });
}
