BEGIN;

CREATE TABLE IF NOT EXISTS governance_policy_layer (
    policy_id uuid NOT NULL,
    version bigint NOT NULL CHECK (version > 0),
    scope text NOT NULL CHECK (scope IN ('global', 'tenant', 'workspace', 'role')),
    tenant_id uuid,
    workspace_id uuid,
    role text,
    state text NOT NULL CHECK (state IN ('draft', 'published', 'retired')),
    rules jsonb NOT NULL,
    published_at timestamptz,
    published_by uuid,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (policy_id, version),
    FOREIGN KEY (tenant_id) REFERENCES iam_tenant (tenant_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES iam_workspace (tenant_id, workspace_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, published_by) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    CHECK (
        (scope = 'global' AND tenant_id IS NULL AND workspace_id IS NULL AND role IS NULL) OR
        (scope = 'tenant' AND tenant_id IS NOT NULL AND workspace_id IS NULL AND role IS NULL) OR
        (scope = 'workspace' AND tenant_id IS NOT NULL AND workspace_id IS NOT NULL AND role IS NULL) OR
        (scope = 'role' AND tenant_id IS NOT NULL AND workspace_id IS NOT NULL AND role IS NOT NULL)
    ),
    CHECK (
        (state = 'published' AND published_at IS NOT NULL AND (published_by IS NOT NULL OR scope = 'global')) OR
        (state <> 'published' AND published_at IS NULL AND published_by IS NULL)
    )
);

CREATE UNIQUE INDEX governance_one_published_policy_per_scope
    ON governance_policy_layer (scope, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(role, ''))
    WHERE state = 'published';

CREATE TABLE IF NOT EXISTS governance_policy_evaluation (
    tenant_id uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    request_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    policy_version text NOT NULL,
    decision text NOT NULL CHECK (decision IN ('ALLOW', 'DENY')),
    deny_reasons jsonb NOT NULL,
    evaluated_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, evaluation_id),
    FOREIGN KEY (tenant_id, workspace_id) REFERENCES iam_workspace (tenant_id, workspace_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, user_id) REFERENCES iam_user (tenant_id, user_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id, device_id) REFERENCES iam_device (tenant_id, device_id) ON DELETE RESTRICT
);

GRANT SELECT ON governance_policy_layer TO domus_identity_runtime;
GRANT SELECT, INSERT ON governance_policy_evaluation TO domus_identity_runtime;
ALTER TABLE governance_policy_layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_policy_layer FORCE ROW LEVEL SECURITY;
ALTER TABLE governance_policy_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_policy_evaluation FORCE ROW LEVEL SECURITY;

CREATE POLICY governance_policy_read_scope ON governance_policy_layer
    FOR SELECT TO domus_identity_runtime USING (
        EXISTS (
            SELECT 1 FROM iam_workspace_membership membership
             WHERE membership.tenant_id = domus_security.current_uuid('app.current_tenant_id')
               AND membership.workspace_id = domus_security.current_uuid('app.current_workspace_id')
               AND membership.user_id = domus_security.current_uuid('app.current_user_id')
               AND membership.status = 'active'
        ) AND (scope = 'global' OR (
            tenant_id = domus_security.current_uuid('app.current_tenant_id')
            AND (workspace_id IS NULL OR workspace_id = domus_security.current_uuid('app.current_workspace_id'))
        ))
    );

CREATE POLICY governance_policy_evaluation_scope ON governance_policy_evaluation TO domus_identity_runtime
    USING (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id'))
    WITH CHECK (tenant_id = domus_security.current_uuid('app.current_tenant_id') AND workspace_id = domus_security.current_uuid('app.current_workspace_id') AND user_id = domus_security.current_uuid('app.current_user_id'));

INSERT INTO schema_migrations (version, description)
VALUES (4, 'V1-103 published policy layers and evaluation audit')
ON CONFLICT (version) DO NOTHING;

COMMIT;
