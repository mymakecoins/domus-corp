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
import type {ArchiveWorkspaceCommand, ChangeWorkspaceMembershipCommand, CreateWorkspaceCommand} from "./application/tenancy/manage-workspace.js";
import type {Workspace} from "./domain/tenancy/workspace.js";
import {registerTenancyRoutes} from "./interfaces/http/tenancy/routes.js";
import {registerPolicyRoutes} from "./interfaces/http/policy/routes.js";
import type {PolicySecurityContext} from "./application/policy/resolve-effective-policy.js";
import type {EffectivePolicy} from "./domain/policy/policy-engine.js";
import {registerGatewayRoutes, type GatewayRouteServices} from "./interfaces/http/gateway/routes.js";
import {registerSourceRoutes,type SourceRouteServices} from "./interfaces/http/source/routes.js";
import {registerConnectorRoutes,type ConnectorRouteServices}from"./interfaces/http/source/connector-routes.js";

type IdentityServices = Readonly<{
  establishSession(command: EstablishSessionCommand): Promise<AuthenticatedSession>;
  issueDeviceChallenge(command: IssueDeviceChallengeCommand): Promise<{nonce: string; audience: string; expiresAt: string}>;
  registerDevice(command: RegisterDeviceCommand): Promise<{status: "ACTIVE"; version: number}>;
  terminateSession(command: TerminateSessionCommand): Promise<{version: number}>;
  revokeDevice(command: RevokeDeviceCommand): Promise<{version: number}>;
  authorizeIdentity(request: FastifyRequest): Promise<{tenantId: string; userId: string}>;
  authorizeAdministration(request: FastifyRequest): Promise<{tenantId: string; userId: string; deviceId: string; sessionId: string}>;
  createWorkspace(command: CreateWorkspaceCommand): Promise<Workspace>;
  archiveWorkspace(command: ArchiveWorkspaceCommand): Promise<{version: number}>;
  changeWorkspaceMembership(command: ChangeWorkspaceMembershipCommand): Promise<{version: number}>;
  authorizePolicyRequest(request: FastifyRequest): Promise<PolicySecurityContext>;
  resolveEffectivePolicy(context: PolicySecurityContext): Promise<EffectivePolicy>;
}>;

const unavailableGateway:GatewayRouteServices={async authorize(){throw new Error('GATEWAY_DEPENDENCY_UNAVAILABLE');},async execute(){throw new Error('GATEWAY_DEPENDENCY_UNAVAILABLE');},countInputTokens(){return 0;},scopeKeys(){return [];}};

export function buildApp(identityServices?: IdentityServices,gatewayServices:GatewayRouteServices=unavailableGateway,sourceServices?:SourceRouteServices,connectorServices?:ConnectorRouteServices): FastifyInstance {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    service: "control-plane",
    status: "ok",
    version: config.appVersion,
  }));
  registerGatewayRoutes(app,gatewayServices);
  if(sourceServices)registerSourceRoutes(app,sourceServices);
  if(connectorServices)registerConnectorRoutes(app,connectorServices);

  if (identityServices) {
    registerIdentityRoutes(app, identityServices);
    registerTenancyRoutes(app, identityServices);
    registerPolicyRoutes(app, identityServices);
  }

  return app;
}
