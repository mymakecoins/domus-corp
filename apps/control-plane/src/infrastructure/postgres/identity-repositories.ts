import { createHash, randomUUID } from "node:crypto";

import type { AuthenticatedSession } from "../../domain/identity/authenticated-session.js";
import type { Device } from "../../domain/identity/device.js";
import type { ExternalIdentity } from "../../domain/identity/external-identity.js";
import type {Workspace} from "../../domain/tenancy/workspace.js";
import type {TenantRole} from "../../domain/tenancy/workspace-authorization.js";
import type {PolicyLayer} from "../../domain/policy/policy-engine.js";

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
    tenantRoleRepository: Object.freeze({
      async find(tenantId: string, userId: string): Promise<TenantRole | undefined> {
        return inIdentityTransaction(pool, {tenantId, userId}, async (client) => {
          const result = await client.query<{tenant_id: string; user_id: string; role: "member" | "admin"; status: "ACTIVE" | "SUSPENDED" | "REVOKED"}>(
            `SELECT tenant_id, user_id, role, upper(status) AS status
               FROM iam_tenant_role WHERE tenant_id = $1 AND user_id = $2`,
            [tenantId, userId],
          );
          const row = result.rows[0];
          return row ? Object.freeze({tenantId: row.tenant_id, userId: row.user_id, role: row.role, status: row.status}) : undefined;
        });
      },
    }),
    userRepository: Object.freeze({
      async assertActive(tenantId: string, userId: string): Promise<void> {
        await inIdentityTransaction(pool, {tenantId, userId}, async (client) => {
          const result = await client.query(`SELECT 1 FROM iam_user WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'`, [tenantId, userId]);
          if (result.rows[0] === undefined) throw new Error("TENANT_ACCESS_DENIED");
        });
      },
    }),
    workspaceRepository: Object.freeze({
      async create(input: Readonly<{
        workspace: Workspace;
        ownerMembership: Readonly<{tenantId: string; workspaceId: string; userId: string; role: "owner"; status: "ACTIVE"; classificationClearance: "restricted"}>;
        actor: Readonly<{userId: string; deviceId: string; sessionId: string}>;
        requestId: string; eventId: string; occurredAt: string;
      }>): Promise<void> {
        await inIdentityTransaction(pool, {...input.workspace, userId: input.actor.userId}, async (client) => {
          const workspace = input.workspace;
          await client.query(
            `INSERT INTO iam_workspace
              (tenant_id, workspace_id, owner_user_id, name, status, default_classification, domain_key, policy_id, version)
             VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8)`,
            [workspace.tenantId, workspace.workspaceId, workspace.ownerUserId, workspace.name,
              workspace.defaultClassification, workspace.domainKey, workspace.policyId, workspace.version],
          );
          await client.query(
            `INSERT INTO iam_workspace_membership
              (tenant_id, workspace_id, user_id, role, status, classification_clearance)
             VALUES ($1,$2,$3,'owner','active',$4)`,
            [input.ownerMembership.tenantId, input.ownerMembership.workspaceId,
              input.ownerMembership.userId, input.ownerMembership.classificationClearance],
          );
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id, session_id, occurred_at, attributes)
             VALUES ($1,$2,'workspace.created.v1',$3,$4,$5,$6,$7,$8::jsonb)`,
            [workspace.tenantId, input.eventId, input.requestId, input.actor.userId,
              input.actor.deviceId, input.actor.sessionId, input.occurredAt,
              JSON.stringify({workspace_id: workspace.workspaceId, policy_id: workspace.policyId})],
          );
        });
      },
      async archive(command: {
        tenantId: string; userId: string; deviceId: string; sessionId: string; workspaceId: string;
        requestId: string; eventId: string; archivedAt: string;
      }): Promise<{version: number}> {
        return inIdentityTransaction(pool, command, async (client) => {
          const result = await client.query<{version: number}>(
            `UPDATE iam_workspace SET status = 'archived', version = version + 1
              WHERE tenant_id = $1 AND workspace_id = $2 AND status = 'active'
          RETURNING version`,
            [command.tenantId, command.workspaceId],
          );
          const row = result.rows[0];
          if (!row) throw new Error("WORKSPACE_ACCESS_DENIED");
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id, session_id, occurred_at, attributes)
             VALUES ($1,$2,'workspace.archived.v1',$3,$4,$5,$6,$7,$8::jsonb)`,
            [command.tenantId, command.eventId, command.requestId, command.userId,
              command.deviceId, command.sessionId, command.archivedAt,
              JSON.stringify({workspace_id: command.workspaceId, workspace_version: row.version})],
          );
          return {version: row.version};
        });
      },
      async changeMembership(command: {
        tenantId: string; userId: string; deviceId: string; sessionId: string; workspaceId: string;
        memberUserId: string; role: "member" | "manager" | "owner" | "admin";
        status: "ACTIVE" | "SUSPENDED" | "REVOKED"; classificationClearance: string;
        requestId: string; eventId: string; changedAt: string;
      }): Promise<{version: number}> {
        return inIdentityTransaction(pool, command, async (client) => {
          const result = await client.query<{version: number}>(
            `INSERT INTO iam_workspace_membership
              (tenant_id, workspace_id, user_id, role, status, classification_clearance)
             VALUES ($1,$2,$3,$4,lower($5),$6)
             ON CONFLICT (tenant_id, workspace_id, user_id) DO UPDATE
               SET role = EXCLUDED.role, status = EXCLUDED.status,
                   classification_clearance = EXCLUDED.classification_clearance,
                   version = iam_workspace_membership.version + 1
             RETURNING version`,
            [command.tenantId, command.workspaceId, command.memberUserId, command.role,
              command.status, command.classificationClearance],
          );
          const row = result.rows[0];
          if (!row) throw new Error("WORKSPACE_ACCESS_DENIED");
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id, session_id, occurred_at, attributes)
             VALUES ($1,$2,'workspace.membership_changed.v1',$3,$4,$5,$6,$7,$8::jsonb)`,
            [command.tenantId, command.eventId, command.requestId, command.userId,
              command.deviceId, command.sessionId, command.changedAt,
              JSON.stringify({workspace_id: command.workspaceId, member_user_id: command.memberUserId,
                role: command.role, status: command.status, membership_version: row.version})],
          );
          const paused = await client.query<{source_id:string;version:number;classification:string}>(
            `UPDATE source_registry SET status='paused',status_reason='owner_membership_ineligible',version=version+1,updated_at=$1
              WHERE tenant_id=$2 AND workspace_id=$3 AND owner_user_id=$4 AND status='active'
                AND ($5<>'ACTIVE' OR CASE classification WHEN 'public' THEN 0 WHEN 'internal' THEN 1 WHEN 'confidential' THEN 2 ELSE 3 END > CASE $6 WHEN 'public' THEN 0 WHEN 'internal' THEN 1 WHEN 'confidential' THEN 2 ELSE 3 END)
          RETURNING source_id,version,classification`,
            [command.changedAt,command.tenantId,command.workspaceId,command.memberUserId,command.status,command.classificationClearance],
          );
          for(const source of paused.rows){
            const auditId=randomUUID();const sourceEventId=randomUUID();
            await client.query(`INSERT INTO source_registry_audit(tenant_id,workspace_id,audit_id,request_id,actor_id,source_id,source_version,operation,attributes,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,'source.paused.v1',$8::jsonb,$9)`,[command.tenantId,command.workspaceId,auditId,command.requestId,command.userId,source.source_id,source.version,JSON.stringify({source_id:source.source_id,source_version:source.version,status:"PAUSED",classification:source.classification,reason_code:"owner_membership_ineligible"}),command.changedAt]);
            await client.query(`INSERT INTO source_registry_outbox(tenant_id,workspace_id,event_id,event_type,request_id,actor_id,source_id,source_version,classification,status,occurred_at,attributes) VALUES($1,$2,$3,'source.paused.v1',$4,$5,$6,$7,$8,'paused',$9,$10::jsonb)`,[command.tenantId,command.workspaceId,sourceEventId,command.requestId,command.userId,source.source_id,source.version,source.classification,command.changedAt,JSON.stringify({reason_code:"owner_membership_ineligible"})]);
          }
          return {version: row.version};
        });
      },
    }),
    policyRepository: Object.freeze({
      async loadPublished(context: {tenantId: string; workspaceId: string; userId: string}): Promise<readonly PolicyLayer[]> {
        return inIdentityTransaction(pool, context, async (client) => {
          const result = await client.query<{
            scope: PolicyLayer["scope"]; policy_id: string; version: number; rules: Omit<PolicyLayer, "scope" | "policyId" | "version">;
          }>(
            `SELECT layer.scope, layer.policy_id, layer.version, layer.rules
               FROM governance_policy_layer layer
              WHERE layer.state = 'published' AND (
                    layer.scope = 'global'
                 OR (layer.scope = 'tenant' AND layer.tenant_id = $1)
                 OR (layer.scope = 'workspace' AND layer.tenant_id = $1 AND layer.workspace_id = $2)
                 OR (layer.scope = 'role' AND layer.tenant_id = $1 AND layer.workspace_id = $2 AND layer.role = (
                      SELECT membership.role FROM iam_workspace_membership membership
                       WHERE membership.tenant_id = $1 AND membership.workspace_id = $2
                         AND membership.user_id = $3 AND membership.status = 'active'
                 )))
              ORDER BY CASE layer.scope WHEN 'global' THEN 1 WHEN 'tenant' THEN 2 WHEN 'workspace' THEN 3 ELSE 4 END`,
            [context.tenantId, context.workspaceId, context.userId],
          );
          return result.rows.map((row) => Object.freeze({scope: row.scope, policyId: row.policy_id, version: Number(row.version), ...row.rules}));
        });
      },
    }),
    policyAuditRepository: Object.freeze({
      async record(event: {
        requestId: string; tenantId: string; workspaceId: string; userId: string; deviceId: string;
        policyVersion: string; decision: "ALLOW" | "DENY"; denyReasons: readonly string[];
      }): Promise<void> {
        await inIdentityTransaction(pool, event, async (client) => {
          await client.query(
            `INSERT INTO governance_policy_evaluation
              (tenant_id, evaluation_id, request_id, workspace_id, user_id, device_id,
               policy_version, decision, deny_reasons, evaluated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,clock_timestamp())`,
            [event.tenantId, randomUUID(), event.requestId, event.workspaceId, event.userId,
              event.deviceId, event.policyVersion, event.decision, JSON.stringify(event.denyReasons)],
          );
        });
      },
    }),
    deviceRepository: Object.freeze({
      async registerActive(command: {
        tenantId: string; userId: string; deviceId: string; publicKeyThumbprint: string;
        requestId: string; eventId: string; registeredAt: string;
      }): Promise<{version: number}> {
        return inIdentityTransaction(pool, command, async (client) => {
          const result = await client.query<{version: number}>(
            `INSERT INTO iam_device
              (tenant_id, device_id, user_id, public_key_thumbprint, status,
               version, registered_at, activated_at)
             VALUES ($1,$2,$3,$4,'active',2,$5,$5)
             RETURNING version`,
            [command.tenantId, command.deviceId, command.userId,
              command.publicKeyThumbprint, command.registeredAt],
          );
          const row = result.rows[0];
          if (!row) throw new Error("IDENTITY_DEPENDENCY_UNAVAILABLE");
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id,
               session_id, occurred_at, attributes)
             VALUES ($1,$2,'device.registered.v1',$3,$4,$5,NULL,$6,$7::jsonb)`,
            [command.tenantId, command.eventId, command.requestId, command.userId,
              command.deviceId, command.registeredAt,
              JSON.stringify({device_version: row.version})],
          );
          return {version: row.version};
        });
      },
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
      async terminate(command: {
        tenantId: string; userId: string; sessionId: string; requestId: string;
        eventId: string; terminatedAt: string;
      }): Promise<{version: number}> {
        return inIdentityTransaction(pool, command, async (client) => {
          const result = await client.query<{version: number; device_id: string}>(
            `UPDATE iam_auth_session
                SET revoked_at = $4, revoked_by = $2, revocation_reason = 'USER_LOGOUT',
                    version = version + 1
              WHERE tenant_id = $1 AND user_id = $2 AND session_id = $3 AND revoked_at IS NULL
          RETURNING version, device_id`,
            [command.tenantId, command.userId, command.sessionId, command.terminatedAt],
          );
          const row = result.rows[0];
          if (!row) throw new Error("IDENTITY_TOKEN_INVALID");
          await client.query(
            `INSERT INTO iam_outbox_event
              (tenant_id, event_id, event_type, request_id, user_id, device_id,
               session_id, occurred_at, attributes)
             VALUES ($1,$2,'identity.session_terminated.v1',$3,$4,$5,$6,$7,$8::jsonb)`,
            [command.tenantId, command.eventId, command.requestId, command.userId,
              row.device_id, command.sessionId, command.terminatedAt,
              JSON.stringify({reason_code: "USER_LOGOUT"})],
          );
          return {version: row.version};
        });
      },
    }),
  });
}
