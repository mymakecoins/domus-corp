import { rejectUnknown, requireText, requireTimestamp, requireUuid } from "./validation.js";

export type RequestSecurityContext = Readonly<{
  requestId: string;
  traceId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  workspaceId: string;
  clientVersion: string;
  authenticatedAt: string;
}>;

const ALLOWED = new Set([
  "requestId", "traceId", "sessionId", "userId", "tenantId", "deviceId",
  "workspaceId", "clientVersion", "authenticatedAt",
]);

export function createRequestSecurityContext(input: RequestSecurityContext): RequestSecurityContext {
  rejectUnknown(input, ALLOWED);
  for (const name of ["requestId", "sessionId", "userId", "tenantId", "deviceId", "workspaceId"] as const) {
    requireUuid(input[name], name);
  }
  requireText(input.traceId, "traceId");
  if (!/^[a-f0-9]{32}$/.test(input.traceId)) throw new Error("traceId must be 32 lowercase hex characters");
  requireText(input.clientVersion, "clientVersion");
  requireTimestamp(input.authenticatedAt, "authenticatedAt");
  return Object.freeze({...input});
}
