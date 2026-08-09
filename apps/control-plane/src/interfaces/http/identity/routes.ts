import { randomUUID } from "node:crypto";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { AuthenticatedSession } from "../../../domain/identity/authenticated-session.js";
import type { EstablishSessionCommand } from "../../../application/identity/establish-session.js";
import type { IssueDeviceChallengeCommand } from "../../../application/identity/issue-device-challenge.js";
import type { RegisterDeviceCommand } from "../../../application/identity/register-device.js";
import type { RevokeDeviceCommand } from "../../../application/identity/revoke-device.js";
import type { TerminateSessionCommand } from "../../../application/identity/terminate-session.js";

type Services = Readonly<{
  establishSession(command: EstablishSessionCommand): Promise<AuthenticatedSession>;
  issueDeviceChallenge(command: IssueDeviceChallengeCommand): Promise<{nonce: string; audience: string; expiresAt: string}>;
  registerDevice(command: RegisterDeviceCommand): Promise<{status: "ACTIVE"; version: number}>;
  terminateSession(command: TerminateSessionCommand): Promise<{version: number}>;
  revokeDevice(command: RevokeDeviceCommand): Promise<{version: number}>;
  authorizeIdentity(request: FastifyRequest): Promise<{tenantId: string; userId: string}>;
  authorizeAdministration(request: FastifyRequest): Promise<{tenantId: string; userId: string}>;
}>;

function bearer(header: string | undefined): string {
  if (!header?.startsWith("Bearer ") || header.length <= 7) throw new Error("IDENTITY_TOKEN_INVALID");
  return header.slice(7);
}

const SAFE_CODES = [
  "IDENTITY_TOKEN_INVALID", "IDENTITY_TOKEN_EXPIRED", "IDENTITY_ISSUER_INVALID",
  "IDENTITY_AUDIENCE_INVALID", "IDENTITY_CLAIM_MISSING", "TENANT_ACCESS_DENIED",
  "TENANT_SELECTION_REQUIRED", "WORKSPACE_ACCESS_DENIED", "DEVICE_NOT_REGISTERED",
  "DEVICE_REVOKED", "DEVICE_PROOF_INVALID", "IDENTITY_DEPENDENCY_UNAVAILABLE",
] as const;

function safeCode(error: unknown): string {
  const message = String(error);
  return SAFE_CODES.find((code) => message.includes(code)) ?? "IDENTITY_DEPENDENCY_UNAVAILABLE";
}

function statusFor(code: string): number {
  if (code === "IDENTITY_DEPENDENCY_UNAVAILABLE") return 503;
  if (code.startsWith("TENANT_") || code.startsWith("WORKSPACE_")) return 403;
  return 401;
}

export function registerIdentityRoutes(app: FastifyInstance, services: Services): void {
  app.post<{Body: {deviceId?: string; clientVersion?: string; requestedTenantId?: string}}>(
    "/v1/identity/sessions",
    async (request, reply) => {
      try {
        if (!request.body?.deviceId || !request.body.clientVersion) throw new Error("IDENTITY_CLAIM_MISSING");
        const session = await services.establishSession({
          token: bearer(request.headers.authorization),
          deviceId: request.body.deviceId,
          clientVersion: request.body.clientVersion,
          requestId: randomUUID(),
          ...(request.body.requestedTenantId ? {requestedTenantId: request.body.requestedTenantId} : {}),
        });
        return reply.code(201).send({
          sessionId: session.sessionId, tenantId: session.tenantId, userId: session.userId,
          deviceId: session.deviceId, clientVersion: session.clientVersion,
          authenticatedAt: session.authenticatedAt, expiresAt: session.expiresAt,
        });
      } catch (error) {
        const code = safeCode(error);
        return reply.code(statusFor(code)).send({code});
      }
    },
  );

  app.post<{Body: {deviceId?: string}}>(
    "/v1/identity/devices/challenges",
    async (request, reply) => {
      try {
        if (!request.body?.deviceId) throw new Error("IDENTITY_CLAIM_MISSING");
        const actor = await services.authorizeIdentity(request);
        const challenge = await services.issueDeviceChallenge({
          tenantId: actor.tenantId,
          userId: actor.userId,
          deviceId: request.body.deviceId,
          audience: "domus-device-registration",
        });
        return reply.code(201).send(challenge);
      } catch (error) {
        const code = safeCode(error);
        return reply.code(statusFor(code)).send({code});
      }
    },
  );

  app.post<{Body: {deviceId?: string; nonce?: string; publicKeyJwk?: Readonly<Record<string, unknown>>; proof?: string}}>(
    "/v1/identity/devices",
    async (request, reply) => {
      try {
        if (!request.body?.deviceId || !request.body.nonce || !request.body.publicKeyJwk || !request.body.proof) {
          throw new Error("IDENTITY_CLAIM_MISSING");
        }
        const actor = await services.authorizeIdentity(request);
        const result = await services.registerDevice({
          tenantId: actor.tenantId,
          userId: actor.userId,
          deviceId: request.body.deviceId,
          publicKeyJwk: request.body.publicKeyJwk,
          nonce: request.body.nonce,
          audience: "domus-device-registration",
          proof: request.body.proof,
          requestId: randomUUID(),
          eventId: randomUUID(),
        });
        return reply.code(201).send(result);
      } catch (error) {
        const code = safeCode(error);
        return reply.code(statusFor(code)).send({code});
      }
    },
  );

  app.delete<{Params: {sessionId: string}}>(
    "/v1/identity/sessions/:sessionId",
    async (request, reply) => {
      try {
        const actor = await services.authorizeIdentity(request);
        const result = await services.terminateSession({
          tenantId: actor.tenantId,
          userId: actor.userId,
          sessionId: request.params.sessionId,
          requestId: randomUUID(),
          eventId: randomUUID(),
        });
        return reply.send(result);
      } catch (error) {
        const code = safeCode(error);
        return reply.code(statusFor(code)).send({code});
      }
    },
  );

  app.delete<{Params: {deviceId: string}; Body: {reasonCode?: string}}>(
    "/v1/identity/devices/:deviceId",
    async (request, reply) => {
      try {
        const actor = await services.authorizeAdministration(request);
        const result = await services.revokeDevice({
          tenantId: actor.tenantId,
          userId: actor.userId,
          deviceId: request.params.deviceId,
          revokedBy: actor.userId,
          reasonCode: request.body?.reasonCode ?? "ADMIN_REVOKED",
          requestId: randomUUID(),
          eventId: randomUUID(),
        });
        return reply.send(result);
      } catch (error) {
        const code = safeCode(error);
        return reply.code(statusFor(code)).send({code});
      }
    },
  );
}
