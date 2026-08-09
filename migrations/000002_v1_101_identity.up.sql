BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'domus_identity_runtime') THEN
        CREATE ROLE domus_identity_runtime NOLOGIN NOBYPASSRLS;
    ELSE
        ALTER ROLE domus_identity_runtime NOLOGIN NOBYPASSRLS;
    END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS domus_security;

CREATE OR REPLACE FUNCTION domus_security.current_uuid(setting_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
    setting_value text;
BEGIN
    setting_value := current_setting(setting_name, true);
    IF setting_value IS NULL OR setting_value = '' THEN
        RETURN NULL;
    END IF;
    RETURN setting_value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
END
$$;

REVOKE ALL ON SCHEMA domus_security FROM PUBLIC;
GRANT USAGE ON SCHEMA domus_security TO domus_identity_runtime;
GRANT EXECUTE ON FUNCTION domus_security.current_uuid(text) TO domus_identity_runtime;

CREATE TABLE IF NOT EXISTS iam_tenant (
    tenant_id uuid PRIMARY KEY,
    name text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'archived')),
    default_classification text NOT NULL CHECK (default_classification IN ('public', 'internal', 'confidential', 'restricted')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS iam_user (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'disabled')),
    pii_classification text NOT NULL DEFAULT 'restricted' CHECK (pii_classification IN ('internal', 'confidential', 'restricted')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, user_id),
    FOREIGN KEY (tenant_id) REFERENCES iam_tenant (tenant_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS iam_external_identity (
    external_identity_id uuid PRIMARY KEY,
    issuer text NOT NULL CHECK (issuer LIKE 'https://%'),
    external_subject text NOT NULL,
    claims_hash text NOT NULL CHECK (claims_hash ~ '^sha256:[a-f0-9]{64}$'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    last_authenticated_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    UNIQUE (issuer, external_subject)
);

CREATE TABLE IF NOT EXISTS iam_user_identity_link (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    external_identity_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (tenant_id, user_id, external_identity_id),
    UNIQUE (external_identity_id, tenant_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (external_identity_id) REFERENCES iam_external_identity (external_identity_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS iam_device (
    tenant_id uuid NOT NULL,
    device_id uuid NOT NULL,
    user_id uuid NOT NULL,
    public_key_thumbprint text NOT NULL CHECK (public_key_thumbprint ~ '^sha256:[A-Za-z0-9_-]{43}$'),
    status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
    registered_at timestamptz NOT NULL,
    activated_at timestamptz,
    revoked_at timestamptz,
    revoked_by uuid,
    revocation_reason text,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, device_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, revoked_by) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS iam_workspace (
    tenant_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    owner_user_id uuid NOT NULL,
    name text NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'archived')),
    default_classification text NOT NULL CHECK (default_classification IN ('public', 'internal', 'confidential', 'restricted')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, workspace_id),
    FOREIGN KEY (tenant_id, owner_user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS iam_workspace_membership (
    tenant_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('member', 'manager', 'owner', 'admin')),
    status text NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, workspace_id, user_id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES iam_workspace (tenant_id, workspace_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS iam_auth_session (
    tenant_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    identity_provider text NOT NULL CHECK (identity_provider LIKE 'https://%'),
    external_subject_hash text NOT NULL CHECK (external_subject_hash ~ '^sha256:[a-f0-9]{64}$'),
    client_version text NOT NULL,
    authenticated_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    last_activity_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revoked_by uuid,
    revocation_reason text,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    PRIMARY KEY (tenant_id, session_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, device_id) REFERENCES iam_device (tenant_id, device_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, revoked_by) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    CHECK (expires_at > authenticated_at),
    CHECK ((revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL) OR
           (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS iam_outbox_event (
    tenant_id uuid NOT NULL,
    event_id uuid NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('identity.session_established.v1', 'identity.session_terminated.v1', 'device.registered.v1', 'device.revoked.v1')),
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    session_id uuid,
    occurred_at timestamptz NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    published_at timestamptz,
    delivery_attempts integer NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    PRIMARY KEY (tenant_id, event_id),
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, device_id) REFERENCES iam_device (tenant_id, device_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, session_id) REFERENCES iam_auth_session (tenant_id, session_id) ON DELETE RESTRICT
);

REVOKE ALL ON iam_external_identity FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON iam_external_identity TO domus_identity_runtime;
GRANT SELECT, INSERT, UPDATE ON iam_tenant, iam_user, iam_user_identity_link, iam_device,
    iam_workspace, iam_workspace_membership, iam_auth_session, iam_outbox_event TO domus_identity_runtime;

ALTER TABLE iam_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_tenant FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_user FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_user_identity_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_user_identity_link FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_device FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_workspace FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_workspace_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_workspace_membership FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_auth_session FORCE ROW LEVEL SECURITY;
ALTER TABLE iam_outbox_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam_outbox_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iam_tenant_scope ON iam_tenant;
CREATE POLICY iam_tenant_scope ON iam_tenant TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id'));

DROP POLICY IF EXISTS iam_user_scope ON iam_user;
CREATE POLICY iam_user_scope ON iam_user TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id'));

DROP POLICY IF EXISTS iam_identity_link_resolution ON iam_user_identity_link;
CREATE POLICY iam_identity_link_resolution ON iam_user_identity_link TO domus_identity_runtime
    USING (true)
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id'));

DROP POLICY IF EXISTS iam_device_scope ON iam_device;
CREATE POLICY iam_device_scope ON iam_device TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND user_id = domus_security.current_uuid('app.current_user_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND user_id = domus_security.current_uuid('app.current_user_id'));

DROP POLICY IF EXISTS iam_workspace_scope ON iam_workspace;
CREATE POLICY iam_workspace_scope ON iam_workspace TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'));

DROP POLICY IF EXISTS iam_workspace_membership_scope ON iam_workspace_membership;
CREATE POLICY iam_workspace_membership_scope ON iam_workspace_membership TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'));

DROP POLICY IF EXISTS iam_auth_session_scope ON iam_auth_session;
CREATE POLICY iam_auth_session_scope ON iam_auth_session TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND user_id = domus_security.current_uuid('app.current_user_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND user_id = domus_security.current_uuid('app.current_user_id'));

DROP POLICY IF EXISTS iam_outbox_scope ON iam_outbox_event;
CREATE POLICY iam_outbox_scope ON iam_outbox_event TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id'));

INSERT INTO schema_migrations (version, description)
VALUES (2, 'V1-101 identity and tenancy foundation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
