import { IdentityDomainError } from "./identity-errors.js";
import { immutableStrings, rejectUnknown, requireText, requireTimestamp } from "./validation.js";

export type ExternalIdentity = Readonly<{
  issuer: string;
  subject: string;
  audiences: readonly string[];
  issuedAt: string;
  expiresAt: string;
  authTime?: string;
  externalGroups: readonly string[];
  externalTenantHints: readonly string[];
  claimsHash: string;
}>;

type ExternalIdentityInput = Omit<ExternalIdentity, "externalTenantHints"> & {
  externalTenantHints?: readonly string[];
};

const ALLOWED = new Set([
  "issuer", "subject", "audiences", "issuedAt", "expiresAt", "authTime",
  "externalGroups", "externalTenantHints", "claimsHash",
]);

export function createExternalIdentity(input: ExternalIdentityInput): ExternalIdentity {
  rejectUnknown(input, ALLOWED);
  requireText(input.issuer, "issuer");
  if (!input.issuer.startsWith("https://")) {
    throw new IdentityDomainError("IDENTITY_INVALID", "issuer must use HTTPS");
  }
  requireText(input.subject, "subject");
  requireTimestamp(input.issuedAt, "issuedAt");
  requireTimestamp(input.expiresAt, "expiresAt");
  if (input.authTime !== undefined) requireTimestamp(input.authTime, "authTime");
  if (Date.parse(input.expiresAt) <= Date.parse(input.issuedAt)) {
    throw new IdentityDomainError("IDENTITY_INVALID", "expiresAt must follow issuedAt");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(input.claimsHash)) {
    throw new IdentityDomainError("IDENTITY_INVALID", "claimsHash must be SHA-256");
  }
  const audiences = immutableStrings(input.audiences, "audiences");
  if (audiences.length === 0) throw new IdentityDomainError("IDENTITY_INVALID", "audiences is required");
  return Object.freeze({
    ...input,
    audiences,
    externalGroups: immutableStrings(input.externalGroups, "externalGroups"),
    externalTenantHints: immutableStrings(input.externalTenantHints ?? [], "externalTenantHints"),
  });
}
