import { createAuthenticatedSession, type AuthenticatedSession } from "../../domain/identity/authenticated-session.js";
import type { Device } from "../../domain/identity/device.js";
import type { ExternalIdentity } from "../../domain/identity/external-identity.js";
import { IdentityDomainError } from "../../domain/identity/identity-errors.js";

export type EstablishSessionDependencies = Readonly<{
  oidcProvider: {verify(token: string): Promise<ExternalIdentity>};
  identityRepository: {resolve(identity: ExternalIdentity): Promise<{userId: string; tenantIds: readonly string[]}>};
  deviceRepository: {find(deviceId: string): Promise<Device | undefined>};
  sessionRepository: {save(session: AuthenticatedSession): Promise<unknown>};
  clock: {now(): Date};
  ids: {next(): string};
}>;

export type EstablishSessionCommand = Readonly<{
  token: string;
  deviceId: string;
  clientVersion: string;
  requestedTenantId?: string;
}>;

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export async function establishSession(
  dependencies: EstablishSessionDependencies,
  command: EstablishSessionCommand,
): Promise<AuthenticatedSession> {
  const external = await dependencies.oidcProvider.verify(command.token);
  const resolved = await dependencies.identityRepository.resolve(external);
  if (resolved.tenantIds.length === 0) throw new IdentityDomainError("TENANT_ACCESS_DENIED");

  let tenantId = command.requestedTenantId;
  if (tenantId === undefined) {
    if (resolved.tenantIds.length !== 1) throw new IdentityDomainError("TENANT_SELECTION_REQUIRED");
    tenantId = resolved.tenantIds[0];
  }
  if (tenantId === undefined || !resolved.tenantIds.includes(tenantId)) {
    throw new IdentityDomainError("TENANT_ACCESS_DENIED");
  }

  const device = await dependencies.deviceRepository.find(command.deviceId);
  if (device === undefined) throw new IdentityDomainError("DEVICE_NOT_REGISTERED");
  if (device.status === "REVOKED") throw new IdentityDomainError("DEVICE_REVOKED");
  if (device.status !== "ACTIVE" || device.userId !== resolved.userId || device.tenantId !== tenantId) {
    throw new IdentityDomainError("TENANT_ACCESS_DENIED");
  }

  const authenticatedAt = dependencies.clock.now();
  const session = createAuthenticatedSession({
    sessionId: dependencies.ids.next(),
    userId: resolved.userId,
    tenantId,
    deviceId: device.deviceId,
    clientVersion: command.clientVersion,
    authenticatedAt: authenticatedAt.toISOString(),
    expiresAt: new Date(authenticatedAt.getTime() + SESSION_MAX_AGE_MS).toISOString(),
    identityProvider: external.issuer,
    externalSubject: external.subject,
  });
  await dependencies.sessionRepository.save(session);
  return session;
}
