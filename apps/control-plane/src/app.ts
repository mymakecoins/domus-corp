import Fastify, { type FastifyInstance } from "fastify";

import { loadConfig } from "./config.js";
import { registerIdentityRoutes } from "./interfaces/http/identity/routes.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedSession } from "./domain/identity/authenticated-session.js";
import type { EstablishSessionCommand } from "./application/identity/establish-session.js";
import type { IssueDeviceChallengeCommand } from "./application/identity/issue-device-challenge.js";
import type { RegisterDeviceCommand } from "./application/identity/register-device.js";
import type { RevokeDeviceCommand } from "./application/identity/revoke-device.js";
import type { TerminateSessionCommand } from "./application/identity/terminate-session.js";

type IdentityServices = Readonly<{
  establishSession(command: EstablishSessionCommand): Promise<AuthenticatedSession>;
  issueDeviceChallenge(command: IssueDeviceChallengeCommand): Promise<{nonce: string; audience: string; expiresAt: string}>;
  registerDevice(command: RegisterDeviceCommand): Promise<{status: "ACTIVE"; version: number}>;
  terminateSession(command: TerminateSessionCommand): Promise<{version: number}>;
  revokeDevice(command: RevokeDeviceCommand): Promise<{version: number}>;
  authorizeIdentity(request: FastifyRequest): Promise<{tenantId: string; userId: string}>;
  authorizeAdministration(request: FastifyRequest): Promise<{tenantId: string; userId: string}>;
}>;

export function buildApp(identityServices?: IdentityServices): FastifyInstance {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    service: "control-plane",
    status: "ok",
    version: config.appVersion,
  }));

  if (identityServices) registerIdentityRoutes(app, identityServices);

  return app;
}
