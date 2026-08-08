import { IdentityDomainError } from "./identity-errors.js";
import { rejectUnknown, requireText, requireTimestamp, requireUuid } from "./validation.js";

export type AuthenticatedSession = Readonly<{
  sessionId: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  clientVersion: string;
  authenticatedAt: string;
  expiresAt: string;
  identityProvider: string;
  externalSubject: string;
}>;

const ALLOWED = new Set([
  "sessionId", "userId", "tenantId", "deviceId", "clientVersion",
  "authenticatedAt", "expiresAt", "identityProvider", "externalSubject",
]);

export function createAuthenticatedSession(input: AuthenticatedSession): AuthenticatedSession {
  rejectUnknown(input, ALLOWED);
  for (const name of ["sessionId", "userId", "tenantId", "deviceId"] as const) {
    requireUuid(input[name], name);
  }
  requireText(input.clientVersion, "clientVersion");
  requireTimestamp(input.authenticatedAt, "authenticatedAt");
  requireTimestamp(input.expiresAt, "expiresAt");
  if (Date.parse(input.expiresAt) <= Date.parse(input.authenticatedAt)) {
    throw new IdentityDomainError("IDENTITY_INVALID", "expiresAt must follow authenticatedAt");
  }
  requireText(input.identityProvider, "identityProvider");
  if (!input.identityProvider.startsWith("https://")) {
    throw new IdentityDomainError("IDENTITY_INVALID", "identityProvider must use HTTPS");
  }
  requireText(input.externalSubject, "externalSubject");
  return Object.freeze({...input});
}
