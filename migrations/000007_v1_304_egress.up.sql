BEGIN;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='domus_egress_admin') THEN CREATE ROLE domus_egress_admin NOLOGIN NOBYPASSRLS;ELSE ALTER ROLE domus_egress_admin NOLOGIN NOBYPASSRLS;END IF;END $$;
CREATE TABLE egress_rule(
 rule_id uuid NOT NULL,version bigint NOT NULL CHECK(version>0),ruleset_version bigint NOT NULL CHECK(ruleset_version>0),kind text NOT NULL CHECK(kind IN('pii','secret','forbidden')),
 detector text NOT NULL CHECK(detector IN('email','phone','cpf','literal')),action text NOT NULL CHECK(action IN('mask','block')),
 pattern text, state text NOT NULL CHECK(state IN('draft','published','retired')),published_at timestamptz,owner text NOT NULL,justification text NOT NULL,
 PRIMARY KEY(rule_id,version),CHECK((detector='literal')=(pattern IS NOT NULL)),CHECK(kind='pii' OR action='block'),
 CHECK((state='draft' AND published_at IS NULL) OR (state IN('published','retired') AND published_at IS NOT NULL))
);
CREATE UNIQUE INDEX egress_one_published_rule ON egress_rule(kind,detector,coalesce(pattern,'')) WHERE state='published';
CREATE TABLE egress_exception(
 tenant_id uuid NOT NULL,workspace_id uuid NOT NULL,exception_id uuid NOT NULL,version bigint NOT NULL CHECK(version>0),provider_key text NOT NULL,model_key text NOT NULL,
 pii_types text[] NOT NULL CHECK(pii_types <@ ARRAY['email','phone','cpf']::text[]),owner text NOT NULL,approver text NOT NULL,justification text NOT NULL,
 valid_from timestamptz NOT NULL,expires_at timestamptz NOT NULL,state text NOT NULL CHECK(state IN('active','revoked','expired')),
 PRIMARY KEY(tenant_id,exception_id,version),FOREIGN KEY(tenant_id,workspace_id) REFERENCES iam_workspace(tenant_id,workspace_id) ON DELETE RESTRICT,
 CHECK(owner <> approver),CHECK(expires_at>valid_from AND expires_at<=valid_from+interval '30 days')
);
CREATE TABLE egress_guard_audit(
 tenant_id uuid NOT NULL,workspace_id uuid NOT NULL,audit_id uuid NOT NULL,request_id uuid NOT NULL,provider_key text NOT NULL,model_key text NOT NULL,
 classification text NOT NULL,rule_version bigint NOT NULL,decision text NOT NULL CHECK(decision IN('allow','deny')),deny_reasons jsonb NOT NULL,detections jsonb NOT NULL,
 exception_id uuid,evaluated_at timestamptz NOT NULL,PRIMARY KEY(tenant_id,audit_id),FOREIGN KEY(tenant_id,workspace_id) REFERENCES iam_workspace(tenant_id,workspace_id) ON DELETE RESTRICT
);
GRANT SELECT ON egress_rule,egress_exception TO domus_gateway_runtime;GRANT INSERT ON egress_guard_audit TO domus_gateway_runtime;
GRANT SELECT,INSERT,UPDATE ON egress_rule,egress_exception TO domus_egress_admin;GRANT SELECT,INSERT ON egress_guard_audit TO domus_egress_admin;
ALTER TABLE egress_rule ENABLE ROW LEVEL SECURITY;ALTER TABLE egress_rule FORCE ROW LEVEL SECURITY;ALTER TABLE egress_exception ENABLE ROW LEVEL SECURITY;ALTER TABLE egress_exception FORCE ROW LEVEL SECURITY;ALTER TABLE egress_guard_audit ENABLE ROW LEVEL SECURITY;ALTER TABLE egress_guard_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY egress_rule_gateway_read ON egress_rule FOR SELECT TO domus_gateway_runtime USING(state='published');CREATE POLICY egress_rule_admin_all ON egress_rule TO domus_egress_admin USING(true) WITH CHECK(true);
CREATE POLICY egress_exception_gateway_read ON egress_exception FOR SELECT TO domus_gateway_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id') AND state='active' AND valid_from<=clock_timestamp() AND expires_at>clock_timestamp());
CREATE POLICY egress_exception_admin_all ON egress_exception TO domus_egress_admin USING(true) WITH CHECK(true);
CREATE POLICY egress_audit_gateway_insert ON egress_guard_audit FOR INSERT TO domus_gateway_runtime WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id'));
CREATE POLICY egress_audit_admin_all ON egress_guard_audit TO domus_egress_admin USING(true) WITH CHECK(true);
INSERT INTO schema_migrations(version,description) VALUES(7,'V1-304 egress rules exceptions and redacted audit') ON CONFLICT(version) DO NOTHING;
COMMIT;
