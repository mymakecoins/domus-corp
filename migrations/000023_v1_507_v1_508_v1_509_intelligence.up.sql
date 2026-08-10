BEGIN;

CREATE TABLE IF NOT EXISTS change_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    change_type VARCHAR(32) NOT NULL,
    impact_score FLOAT DEFAULT 0.0,
    impacted_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
    impacted_owners JSONB NOT NULL DEFAULT '[]'::jsonb,
    before_digest TEXT,
    after_digest TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS briefing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(64) NOT NULL,
    summary TEXT NOT NULL,
    changes_included JSONB DEFAULT '[]'::jsonb,
    gaps_included JSONB DEFAULT '[]'::jsonb,
    quality_alerts JSONB DEFAULT '[]'::jsonb,
    staleness_warnings JSONB DEFAULT '[]'::jsonb,
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS briefing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    is_paused BOOLEAN DEFAULT FALSE,
    periodicity VARCHAR(32) DEFAULT 'weekly',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_briefing_pref UNIQUE(tenant_id, workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS operational_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rule_id VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    confidence FLOAT DEFAULT 1.0,
    time_window VARCHAR(64) NOT NULL,
    evidences JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_owner VARCHAR(128),
    recommended_action TEXT,
    status VARCHAR(32) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insight_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    rule_id VARCHAR(128) NOT NULL,
    version INT DEFAULT 1,
    threshold_value FLOAT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(128),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insight_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    insight_id UUID NOT NULL REFERENCES operational_insights(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    feedback_type VARCHAR(32) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
