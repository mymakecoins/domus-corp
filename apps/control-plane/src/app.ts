import Fastify, { type FastifyInstance } from "fastify";

import { loadConfig } from "./config.js";
import { registerIdentityRoutes } from "./interfaces/http/identity/routes.js";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedSession } from "./domain/identity/authenticated-session.js";
import type { EstablishSessionCommand } from "./application/identity/establish-session.js";
import type { RevokeDeviceCommand } from "./application/identity/revoke-device.js";

type IdentityServices = Readonly<{
  establishSession(command: EstablishSessionCommand): Promise<AuthenticatedSession>;
  revokeDevice(command: RevokeDeviceCommand): Promise<{version: number}>;
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
