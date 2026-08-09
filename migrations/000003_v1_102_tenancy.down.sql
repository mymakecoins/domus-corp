BEGIN;

DROP POLICY IF EXISTS iam_workspace_membership_scope ON iam_workspace_membership;
CREATE POLICY iam_workspace_membership_scope ON iam_workspace_membership TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'));

DROP POLICY IF EXISTS iam_workspace_scope ON iam_workspace;
CREATE POLICY iam_workspace_scope ON iam_workspace TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'));

DROP POLICY IF EXISTS iam_tenant_role_scope ON iam_tenant_role;
REVOKE ALL ON FUNCTION domus_security.is_tenant_admin(uuid) FROM domus_identity_runtime;
DROP FUNCTION IF EXISTS domus_security.is_tenant_admin(uuid);

DELETE FROM iam_outbox_event WHERE event_type IN ('workspace.created.v1', 'workspace.archived.v1', 'workspace.membership_changed.v1');
ALTER TABLE iam_outbox_event DROP CONSTRAINT iam_outbox_event_event_type_check;
ALTER TABLE iam_outbox_event ADD CONSTRAINT iam_outbox_event_event_type_check CHECK (event_type IN (
    'identity.session_established.v1', 'identity.session_terminated.v1',
    'device.registered.v1', 'device.revoked.v1'
));

ALTER TABLE iam_workspace_membership DROP COLUMN IF EXISTS classification_clearance;
ALTER TABLE iam_workspace DROP COLUMN IF EXISTS policy_id;
ALTER TABLE iam_workspace DROP COLUMN IF EXISTS domain_key;
DROP TABLE IF EXISTS iam_tenant_role;

DELETE FROM schema_migrations WHERE version = 3;

COMMIT;
