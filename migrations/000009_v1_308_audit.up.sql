BEGIN;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='domus_audit_reader') THEN CREATE ROLE domus_audit_reader NOLOGIN NOBYPASSRLS;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='domus_audit_maintenance') THEN CREATE ROLE domus_audit_maintenance NOLOGIN NOBYPASSRLS;END IF;END $$;
CREATE TABLE audit_event(
 tenant_id uuid NOT NULL,workspace_id uuid,event_id uuid NOT NULL,request_id uuid NOT NULL,trace_id char(32),actor_id text NOT NULL,actor_type text NOT NULL CHECK(actor_type IN('user','workload','system')),
 operation text NOT NULL,result text NOT NULL CHECK(result IN('succeeded','denied','failed','cancelled','inconclusive')),attributes jsonb NOT NULL CHECK(jsonb_typeof(attributes)='object' AND pg_column_size(attributes)<=8192),occurred_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,event_id,occurred_at),FOREIGN KEY(tenant_id) REFERENCES iam_tenant(tenant_id) ON DELETE RESTRICT,FOREIGN KEY(tenant_id,workspace_id) REFERENCES iam_workspace(tenant_id,workspace_id) ON DELETE RESTRICT,CHECK(trace_id IS NULL OR trace_id ~ '^[0-9a-f]{32}$')
) PARTITION BY RANGE(occurred_at);
CREATE TABLE audit_event_default PARTITION OF audit_event DEFAULT;
CREATE INDEX audit_event_cursor_idx ON audit_event(tenant_id,workspace_id,occurred_at,event_id);
CREATE TABLE audit_access_event(
 tenant_id uuid NOT NULL,workspace_id uuid,access_event_id uuid NOT NULL,actor_id text NOT NULL,purpose text NOT NULL CHECK(length(trim(purpose)) BETWEEN 3 AND 256),query_from timestamptz NOT NULL,query_to timestamptz NOT NULL,result_count integer NOT NULL CHECK(result_count BETWEEN 0 AND 10000),occurred_at timestamptz NOT NULL,
 PRIMARY KEY(tenant_id,access_event_id),FOREIGN KEY(tenant_id) REFERENCES iam_tenant(tenant_id) ON DELETE RESTRICT,FOREIGN KEY(tenant_id,workspace_id) REFERENCES iam_workspace(tenant_id,workspace_id) ON DELETE RESTRICT,CHECK(query_to>query_from AND query_to<=query_from+interval '31 days')
);
GRANT INSERT ON audit_event TO domus_gateway_runtime;GRANT SELECT ON audit_event TO domus_audit_reader;GRANT INSERT,SELECT ON audit_access_event TO domus_audit_reader;GRANT SELECT,DELETE ON audit_event,audit_access_event TO domus_audit_maintenance;
ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;ALTER TABLE audit_event FORCE ROW LEVEL SECURITY;ALTER TABLE audit_access_event ENABLE ROW LEVEL SECURITY;ALTER TABLE audit_access_event FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_gateway_insert ON audit_event FOR INSERT TO domus_gateway_runtime WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND (workspace_id IS NULL OR workspace_id=domus_security.current_uuid('app.current_workspace_id')));
CREATE POLICY audit_reader_select ON audit_event FOR SELECT TO domus_audit_reader USING(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND (workspace_id IS NULL OR workspace_id=domus_security.current_uuid('app.current_workspace_id')));
CREATE POLICY audit_access_reader ON audit_access_event TO domus_audit_reader USING(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND (workspace_id IS NULL OR workspace_id=domus_security.current_uuid('app.current_workspace_id'))) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND (workspace_id IS NULL OR workspace_id=domus_security.current_uuid('app.current_workspace_id')));
CREATE POLICY audit_maintenance_retention ON audit_event FOR DELETE TO domus_audit_maintenance USING(occurred_at<clock_timestamp()-interval '30 days');CREATE POLICY audit_maintenance_access_retention ON audit_access_event FOR DELETE TO domus_audit_maintenance USING(occurred_at<clock_timestamp()-interval '30 days');
INSERT INTO schema_migrations(version,description) VALUES(9,'V1-308 correlated append-only audit and self-audited access') ON CONFLICT(version) DO NOTHING;
COMMIT;
