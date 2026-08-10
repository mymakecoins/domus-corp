BEGIN;
CREATE TABLE knowledge_access_audit(tenant_id uuid NOT NULL,workspace_id uuid NOT NULL,event_id uuid NOT NULL,request_id uuid NOT NULL,user_id uuid NOT NULL,policy_version text NOT NULL,decision text NOT NULL CHECK(decision IN('ALLOW','DENY')),candidate_count integer NOT NULL DEFAULT 0 CHECK(candidate_count BETWEEN 0 AND 500),returned_count integer NOT NULL DEFAULT 0 CHECK(returned_count BETWEEN 0 AND 50),occurred_at timestamptz NOT NULL,PRIMARY KEY(tenant_id,workspace_id,event_id));
REVOKE ALL ON knowledge_access_audit FROM PUBLIC; GRANT INSERT,SELECT ON knowledge_access_audit TO domus_knowledge_runtime;
ALTER TABLE knowledge_access_audit ENABLE ROW LEVEL SECURITY; ALTER TABLE knowledge_access_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY knowledge_access_audit_scope ON knowledge_access_audit TO domus_knowledge_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id')) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id'));
INSERT INTO schema_migrations(version,description) VALUES(19,'V1-409 pre-retrieval access control audit') ON CONFLICT(version) DO NOTHING;
COMMIT;
