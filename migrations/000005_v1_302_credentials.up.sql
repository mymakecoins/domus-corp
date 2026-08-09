BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'domus_gateway_runtime') THEN
        CREATE ROLE domus_gateway_runtime NOLOGIN NOBYPASSRLS;
    ELSE
        ALTER ROLE domus_gateway_runtime NOLOGIN NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'domus_credential_admin') THEN
        CREATE ROLE domus_credential_admin NOLOGIN NOBYPASSRLS;
    ELSE
        ALTER ROLE domus_credential_admin NOLOGIN NOBYPASSRLS;
    END IF;
END
$$;

CREATE TABLE provider_credential_binding (
    credential_id uuid NOT NULL,
    provider_key text NOT NULL CHECK (provider_key ~ '^[a-z][a-z0-9-]{1,62}$'),
    version bigint NOT NULL CHECK (version > 0),
    state text NOT NULL CHECK (state IN ('pending', 'active', 'revoked')),
    secret_reference text NOT NULL CHECK (length(secret_reference) BETWEEN 1 AND 512),
    created_at timestamptz NOT NULL,
    activated_at timestamptz,
    revoked_at timestamptz,
    last_tested_at timestamptz,
    last_test_result text CHECK (last_test_result IN ('passed', 'failed')),
    created_by text NOT NULL,
    PRIMARY KEY (credential_id),
    UNIQUE (provider_key, version),
    CHECK (
        (state = 'pending' AND activated_at IS NULL AND revoked_at IS NULL) OR
        (state = 'active' AND activated_at IS NOT NULL AND revoked_at IS NULL AND last_test_result = 'passed') OR
        (state = 'revoked' AND revoked_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX provider_one_active_credential
    ON provider_credential_binding (provider_key) WHERE state = 'active';

CREATE TABLE provider_credential_audit (
    audit_id uuid PRIMARY KEY,
    credential_id uuid NOT NULL REFERENCES provider_credential_binding (credential_id) ON DELETE RESTRICT,
    request_id uuid NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL CHECK (action IN ('registered', 'tested', 'activated', 'rotated', 'revoked', 'cleanup_required', 'used')),
    result text NOT NULL CHECK (result IN ('succeeded', 'failed', 'denied')),
    credential_version bigint NOT NULL CHECK (credential_version > 0),
    occurred_at timestamptz NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (NOT (details ?| ARRAY['secret', 'token', 'authorization', 'headers', 'body']))
);

CREATE OR REPLACE FUNCTION domus_security.provider_credential_state_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.credential_id <> OLD.credential_id OR NEW.provider_key <> OLD.provider_key OR
       NEW.version <> OLD.version OR NEW.secret_reference <> OLD.secret_reference OR
       (OLD.state = 'revoked' AND NEW.state <> 'revoked') OR
       (OLD.state = 'active' AND NEW.state = 'pending') THEN
        RAISE EXCEPTION 'invalid provider credential transition';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER provider_credential_state_guard
BEFORE UPDATE ON provider_credential_binding
FOR EACH ROW EXECUTE FUNCTION domus_security.provider_credential_state_guard();

GRANT USAGE ON SCHEMA domus_security TO domus_gateway_runtime, domus_credential_admin;
GRANT SELECT ON provider_credential_binding TO domus_gateway_runtime;
GRANT SELECT, INSERT, UPDATE ON provider_credential_binding TO domus_credential_admin;
GRANT SELECT, INSERT ON provider_credential_audit TO domus_credential_admin;
GRANT INSERT ON provider_credential_audit TO domus_gateway_runtime;

ALTER TABLE provider_credential_binding ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credential_binding FORCE ROW LEVEL SECURITY;
ALTER TABLE provider_credential_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credential_audit FORCE ROW LEVEL SECURITY;

CREATE POLICY provider_credential_gateway_read ON provider_credential_binding
    FOR SELECT TO domus_gateway_runtime USING (state = 'active');
CREATE POLICY provider_credential_admin_all ON provider_credential_binding
    TO domus_credential_admin USING (true) WITH CHECK (true);
CREATE POLICY provider_credential_audit_admin ON provider_credential_audit
    TO domus_credential_admin USING (true) WITH CHECK (true);
CREATE POLICY provider_credential_audit_gateway_insert ON provider_credential_audit
    FOR INSERT TO domus_gateway_runtime WITH CHECK (action = 'used');

INSERT INTO schema_migrations (version, description)
VALUES (5, 'V1-302 provider credential metadata and redacted audit')
ON CONFLICT (version) DO NOTHING;

COMMIT;
