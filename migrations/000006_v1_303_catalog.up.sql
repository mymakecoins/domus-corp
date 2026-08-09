BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='domus_catalog_admin') THEN CREATE ROLE domus_catalog_admin NOLOGIN NOBYPASSRLS;
  ELSE ALTER ROLE domus_catalog_admin NOLOGIN NOBYPASSRLS; END IF;
END $$;

CREATE TABLE model_provider_catalog (
  provider_key text NOT NULL CHECK (provider_key ~ '^[a-z][a-z0-9-]{1,62}$'),
  version bigint NOT NULL CHECK(version>0), status text NOT NULL CHECK(status IN ('draft','active','deprecated','disabled')),
  maximum_classification text NOT NULL CHECK(maximum_classification IN ('public','internal','confidential','restricted')),
  owner text NOT NULL, justification text NOT NULL, published_at timestamptz,
  PRIMARY KEY(provider_key,version), CHECK ((status='draft')=(published_at IS NULL))
);
CREATE UNIQUE INDEX provider_one_current_version ON model_provider_catalog(provider_key) WHERE status IN ('active','deprecated');

CREATE TABLE model_catalog (
  model_key text NOT NULL CHECK(model_key ~ '^[a-z][a-z0-9-]{1,62}$'), version bigint NOT NULL CHECK(version>0),
  provider_key text NOT NULL, provider_version bigint NOT NULL, status text NOT NULL CHECK(status IN ('draft','active','deprecated','disabled')),
  capabilities text[] NOT NULL CHECK(capabilities <@ ARRAY['CHAT','EMBEDDINGS','VISION','TOOL_USE','STRUCTURED_OUTPUT','STREAMING']::text[]),
  maximum_classification text NOT NULL CHECK(maximum_classification IN ('public','internal','confidential','restricted')),
  context_window_tokens bigint NOT NULL CHECK(context_window_tokens>0), maximum_output_tokens bigint NOT NULL CHECK(maximum_output_tokens>0),
  price_version bigint NOT NULL CHECK(price_version>0), currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
  input_minor_per_million_tokens bigint NOT NULL CHECK(input_minor_per_million_tokens>=0), output_minor_per_million_tokens bigint NOT NULL CHECK(output_minor_per_million_tokens>=0),
  route_priority integer NOT NULL DEFAULT 100 CHECK(route_priority BETWEEN 1 AND 1000), owner text NOT NULL, justification text NOT NULL, published_at timestamptz,
  PRIMARY KEY(model_key,version), FOREIGN KEY(provider_key,provider_version) REFERENCES model_provider_catalog(provider_key,version) ON DELETE RESTRICT,
  CHECK ((status='draft')=(published_at IS NULL))
);
CREATE UNIQUE INDEX model_one_current_version ON model_catalog(model_key) WHERE status IN ('active','deprecated');

CREATE TABLE model_fallback (
  model_key text NOT NULL, model_version bigint NOT NULL, fallback_model_key text NOT NULL, position smallint NOT NULL CHECK(position BETWEEN 1 AND 3),
  PRIMARY KEY(model_key,model_version,position), UNIQUE(model_key,model_version,fallback_model_key),
  FOREIGN KEY(model_key,model_version) REFERENCES model_catalog(model_key,version) ON DELETE RESTRICT,
  CHECK(model_key<>fallback_model_key)
);
CREATE TABLE model_catalog_audit (
  audit_id uuid PRIMARY KEY, request_id uuid NOT NULL, actor_id text NOT NULL, subject_key text NOT NULL,
  subject_version bigint NOT NULL CHECK(subject_version>0), action text NOT NULL CHECK(action IN ('published','disabled','deprecated')),
  occurred_at timestamptz NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON model_provider_catalog,model_catalog,model_fallback TO domus_gateway_runtime;
GRANT SELECT,INSERT,UPDATE ON model_provider_catalog,model_catalog,model_fallback TO domus_catalog_admin;
GRANT SELECT,INSERT ON model_catalog_audit TO domus_catalog_admin;
ALTER TABLE model_provider_catalog ENABLE ROW LEVEL SECURITY;ALTER TABLE model_provider_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE model_catalog ENABLE ROW LEVEL SECURITY;ALTER TABLE model_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE model_fallback ENABLE ROW LEVEL SECURITY;ALTER TABLE model_fallback FORCE ROW LEVEL SECURITY;
ALTER TABLE model_catalog_audit ENABLE ROW LEVEL SECURITY;ALTER TABLE model_catalog_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY provider_gateway_read ON model_provider_catalog FOR SELECT TO domus_gateway_runtime USING(status='active');
CREATE POLICY model_gateway_read ON model_catalog FOR SELECT TO domus_gateway_runtime USING(status='active');
CREATE POLICY fallback_gateway_read ON model_fallback FOR SELECT TO domus_gateway_runtime USING(EXISTS(SELECT 1 FROM model_catalog m WHERE m.model_key=model_fallback.model_key AND m.version=model_fallback.model_version AND m.status='active'));
CREATE POLICY provider_admin_all ON model_provider_catalog TO domus_catalog_admin USING(true) WITH CHECK(true);
CREATE POLICY model_admin_all ON model_catalog TO domus_catalog_admin USING(true) WITH CHECK(true);
CREATE POLICY fallback_admin_all ON model_fallback TO domus_catalog_admin USING(true) WITH CHECK(true);
CREATE POLICY catalog_audit_admin ON model_catalog_audit TO domus_catalog_admin USING(true) WITH CHECK(true);
INSERT INTO schema_migrations(version,description) VALUES(6,'V1-303 versioned model catalog and deterministic routing') ON CONFLICT(version) DO NOTHING;
COMMIT;
