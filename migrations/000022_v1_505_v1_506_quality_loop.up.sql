BEGIN;

CREATE TABLE IF NOT EXISTS feedback_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    feedback_type VARCHAR(32) NOT NULL,
    rating INT CHECK (rating BETWEEN -1 AND 5),
    comment TEXT,
    evidence_version VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_loop_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    suggested_action TEXT NOT NULL,
    recommended_owner VARCHAR(128) NOT NULL,
    frequency_count INT NOT NULL DEFAULT 1,
    impact_score FLOAT NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    topic VARCHAR(255) NOT NULL,
    sample_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
    frequency INT NOT NULL DEFAULT 1,
    impact_score FLOAT NOT NULL DEFAULT 0.0,
    candidate_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    assigned_owner VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant_ws ON feedback_records(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_quality_loop_tenant_status ON quality_loop_suggestions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_status ON knowledge_gaps(tenant_id, status);

INSERT INTO schema_migrations(version, description) VALUES(22, 'V1-505 V1-506 quality loop and knowledge gaps') ON CONFLICT(version) DO NOTHING;

COMMIT;
