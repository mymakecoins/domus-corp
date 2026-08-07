BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version bigint PRIMARY KEY,
    description text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

INSERT INTO schema_migrations (version, description)
VALUES (1, 'V1-004 technical baseline')
ON CONFLICT (version) DO NOTHING;

COMMIT;
