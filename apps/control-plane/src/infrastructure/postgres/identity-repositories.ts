import { createHash } from "node:crypto";

import type { AuthenticatedSession } from "../../domain/identity/authenticated-session.js";
import type { Device } from "../../domain/identity/device.js";
import type { ExternalIdentity } from "../../domain/identity/external-identity.js";

type QueryResult<Row> = Readonly<{rows: Row[]; rowCount?: number | null}>;
type Queryable = {query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResult<Row>>};
type Client = Queryable & {release(): void};
type Pool = Queryable & {connect(): Promise<Client>};

async function inIdentityTransaction<T>(
  pool: Pool,
  context: {tenantId: string; userId: string; workspaceId?: string},
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.current_tenant_id', $1, true), set_config('app.current_user_id', $2, true), set_config('app.current_workspace_id', $3, true)",
      [context.tenantId, context.userId, context.workspaceId ?? ""],
    );
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function createPostgresIdentityAdapters(pool: Pool) {
  return Object.freeze({
    identityRepository: Object.freeze({
      async resolve(identity: ExternalIdentity) {
        const result = await pool.query<{tenant_id: string; user_id: string}>(
          `SELECT link.tenant_id, link.user_id
             FROM iam_external_identity identity
             JOIN iam_user_identity_link link USING (external_identity_id)
             JOIN iam_user actor ON actor.tenant_id = link.tenant_id AND actor.user_id = link.user_id
            WHERE identity.issuer = $1 AND identity.external_subject = $2 AND actor.status = 'active'
            ORDER BY link.tenant_id`,
          [identity.issuer, identity.subject],
        );
        return {memberships: result.rows.map((row) => ({tenantId: row.tenant_id, userId: row.user_id}))};
      },
    }),
    deviceRepository: Object.freeze({
      async find(deviceId: string, tenantId: string, userId: string): Promise<Device | undefined> {
        return inIdentityTransaction(pool, {tenantId, userId}, async (client) => {
          const result = await client.query<{
            device_id: string; tenant_id: string; user_id: string; public_key_thumbprint: string;
            status: "PENDING" | "ACTIVE" | "REVOKED"; version: number; registered_at: Date;
            activated_at: Date | null; revoked_at: Date | null; revoked_by: string | null;
            revocation_reason: string | null;
          }>(
            `SELECT device_id, tenant_id, user_id, public_key_thumbprint, upper(status) AS status,
                    version, registered_at, activated_at, revoked_at, revoked_by, revocation_reason
               FROM iam_device WHERE tenant_id = $1 AND user_id = $2 AND device_id = $3`,
            [tenantId, userId, deviceId],
          );
          const row = result.rows[0];
          if (!row) return undefined;
          return Object.freeze({
            deviceId: row.device_id, tenantId: row.tenant_id, userId: row.user_id,
            publicKeyThumbprint: row.public_key_thumbprint, status: row.status, version: row.version,
            registeredAt: row.registered_at.toISOString(),
            ...(row.activated_at ? {activatedAt: row.activated_at.toISOString()} : {}),
            ...(row.revoked_at ? {revokedAt: row.revoked_at.toISOString()} : {}),
            ...(row.revoked_by ? {revokedBy: row.revoked_by} : {}),
            ...(row.revocation_reason ? {reasonCode: row.revocation_reason} : {}),
          });
        });
      },
      async revoke(command: {
        tenantId: string; userId: string; deviceId: string; revokedBy: string;
        reasonCode: string; requestId: string; eventId: string; revokedAt: string;
      }): Promise<{version: number}> {
        return inIdentityTransaction(pool, command, async (client) => {
          const result = await client.query<{version: number}>(
            `UPDATE iam_device
                SET status = 'revoked', revoked_at = $4, revoked_by = $5,
                    revocation_reason = $6, version = version + 1
              WHERE tenant_id = $1 AND user_id = $2 AND device_id = $3 AND status <> 'revoked'
          RETURNING version`,
            [command.tenantId, command.userId, command.deviceId, command.revokedAt,
              command.revokedBy, command.reasonCode],
          );
          const row = result.rows[0];
          if (!row) throw new Error("DEVICE_REVOKED");
          await client.query(
            `UPDATE iam_auth_session
                SET revoked_at = $4, revoked_by = $5, revocation_reason = $6, version = version + 1
              WHERE tenant_id = $1 AND user_id = $2 AND device_id = $3 AND revoked_at IS NULL`,
            [command.tenantId, command.userId, command.deviceId, command.revokedAt,
              command.revokedBy, command.reasonCode],
          );
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id, session_id, occurred_at, attributes)
             VALUES ($1,$2,'device.revoked.v1',$3,$4,$5,NULL,$6,$7::jsonb)`,
            [command.tenantId, command.eventId, command.requestId, command.userId,
              command.deviceId, command.revokedAt,
              JSON.stringify({device_version: row.version, reason_code: command.reasonCode})],
          );
          return {version: row.version};
        });
      },
    }),
    sessionRepository: Object.freeze({
      async save(session: AuthenticatedSession, context: {requestId: string; eventId: string}) {
        return inIdentityTransaction(pool, session, async (client) => {
          await client.query(
            `INSERT INTO iam_auth_session
              (tenant_id, session_id, user_id, device_id, identity_provider, external_subject_hash,
               client_version, authenticated_at, expires_at, last_activity_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$8)`,
            [session.tenantId, session.sessionId, session.userId, session.deviceId,
              session.identityProvider, `sha256:${createHash("sha256").update(session.externalSubject).digest("hex")}`,
              session.clientVersion, session.authenticatedAt, session.expiresAt],
          );
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id, session_id, occurred_at, attributes)
             VALUES ($1,$2,'identity.session_established.v1',$3,$4,$5,$6,$7,$8::jsonb)`,
            [session.tenantId, context.eventId, context.requestId, session.userId, session.deviceId,
              session.sessionId, session.authenticatedAt, JSON.stringify({client_version: session.clientVersion})],
          );
        });
      },
    }),
  });
}
