BEGIN;

CREATE TABLE IF NOT EXISTS iam_tenant_role (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('member', 'admin')),
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')),
    granted_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, user_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, granted_by) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT
);

ALTER TABLE iam_workspace
    ADD COLUMN domain_key text NOT NULL CHECK (domain_key ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
    ADD COLUMN policy_id uuid NOT NULL;

ALTER TABLE iam_workspace_membership
    ADD COLUMN classification_clearance text NOT NULL
        CHECK (classification_clearance IN ('public', 'internal', 'confidential', 'restricted'));

ALTER TABLE iam_outbox_event DROP CONSTRAINT iam_outbox_event_event_type_check;
ALTER TABLE iam_outbox_event ADD CONSTRAINT iam_outbox_event_event_type_check CHECK (event_type IN (
    'identity.session_established.v1', 'identity.session_terminated.v1',
    'device.registered.v1', 'device.revoked.v1',
    'workspace.created.v1', 'workspace.archived.v1', 'workspace.membership_changed.v1'
));

CREATE OR REPLACE FUNCTION domus_security.is_tenant_admin(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT target_tenant_id = domus_security.current_uuid('app.current_tenant_id')
       AND EXISTS (
            SELECT 1 FROM public.iam_tenant_role role_binding
             WHERE role_binding.tenant_id = target_tenant_id
               AND role_binding.user_id = domus_security.current_uuid('app.current_user_id')
               AND role_binding.role = 'admin'
               AND role_binding.status = 'active'
       );
$$;

REVOKE ALL ON FUNCTION domus_security.is_tenant_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION domus_security.is_tenant_admin(uuid) TO domus_identity_runtime;
GRANT SELECT, INSERT, UPDATE ON iam_tenant_role TO domus_identity_runtime;

ALTER TABLE iam_tenant_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_tenant_role FORCE ROW LEVEL SECURITY;

CREATE POLICY iam_tenant_role_scope ON iam_tenant_role TO domus_identity_runtime
    USING (
        tenant_id = domus_security.current_uuid('app.current_tenant_id')
        AND (user_id = domus_security.current_uuid('app.current_user_id') OR domus_security.is_tenant_admin(tenant_id))
    )
    WITH CHECK (domus_security.is_tenant_admin(tenant_id));

DROP POLICY iam_workspace_scope ON iam_workspace;
CREATE POLICY iam_workspace_scope ON iam_workspace TO domus_identity_runtime
    USING (
        tenant_id = domus_security.current_uuid('app.current_tenant_id')
        AND (workspace_id = domus_security.current_uuid('app.current_workspace_id') OR domus_security.is_tenant_admin(tenant_id))
    )
    WITH CHECK (
        tenant_id = domus_security.current_uuid('app.current_tenant_id')
        AND (workspace_id = domus_security.current_uuid('app.current_workspace_id') OR domus_security.is_tenant_admin(tenant_id))
    );

DROP POLICY iam_workspace_membership_scope ON iam_workspace_membership;
CREATE POLICY iam_workspace_membership_scope ON iam_workspace_membership TO domus_identity_runtime
    USING (
        tenant_id = domus_security.current_uuid('app.current_tenant_id')
        AND (workspace_id = domus_security.current_uuid('app.current_workspace_id') OR domus_security.is_tenant_admin(tenant_id))
    )
    WITH CHECK (
        tenant_id = domus_security.current_uuid('app.current_tenant_id')
        AND (workspace_id = domus_security.current_uuid('app.current_workspace_id') OR domus_security.is_tenant_admin(tenant_id))
    );

INSERT INTO schema_migrations (version, description)
VALUES (3, 'V1-102 tenant roles, workspace governance and RLS')
ON CONFLICT (version) DO NOTHING;

COMMIT;
