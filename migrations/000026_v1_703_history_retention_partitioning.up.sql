BEGIN;

-- Helper function to check and create range partitions by date for high volume tables
CREATE OR REPLACE FUNCTION create_monthly_partition(
    target_table text,
    year_val integer,
    month_val integer
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    partition_name text;
    start_date text;
    end_date text;
    next_year integer;
    next_month integer;
BEGIN
    partition_name := target_table || '_y' || year_val || 'm' || lpad(month_val::text, 2, '0');
    start_date := year_val || '-' || lpad(month_val::text, 2, '0') || '-01 00:00:00+00';
    
    IF month_val = 12 THEN
        next_year := year_val + 1;
        next_month := 1;
    ELSE
        next_year := year_val;
        next_month := month_val + 1;
    END IF;
    end_date := next_year || '-' || lpad(next_month::text, 2, '0') || '-01 00:00:00+00';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L);',
        partition_name, target_table, start_date, end_date
    );

    RETURN partition_name;
END;
$$;

-- Table to store minimal trace receipts for archived history
CREATE TABLE IF NOT EXISTS history_archive_receipt (
    tenant_id uuid NOT NULL,
    workspace_id uuid,
    receipt_id uuid NOT NULL,
    data_class text NOT NULL,
    archive_filepath text NOT NULL,
    checksum_sha256 text NOT NULL,
    purged_count integer NOT NULL CHECK(purged_count >= 0),
    min_trace_references jsonb NOT NULL CHECK(jsonb_typeof(min_trace_references) = 'array'),
    archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(tenant_id, receipt_id),
    FOREIGN KEY(tenant_id) REFERENCES iam_tenant(tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS history_archive_receipt_tenant_idx ON history_archive_receipt(tenant_id, data_class, archived_at);

GRANT SELECT, INSERT ON history_archive_receipt TO domus_audit_reader;
GRANT SELECT, DELETE ON history_archive_receipt TO domus_audit_maintenance;

ALTER TABLE history_archive_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_archive_receipt FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'history_archive_receipt' AND policyname = 'history_receipt_reader'
    ) THEN
        CREATE POLICY history_receipt_reader ON history_archive_receipt
            FOR SELECT TO domus_audit_reader
            USING(tenant_id = domus_security.current_uuid('app.current_tenant_id'));
    END IF;
END $$;

INSERT INTO schema_migrations(version, description)
VALUES(26, 'V1-703 retention matrix, auto-partitioning and archive receipts')
ON CONFLICT(version) DO NOTHING;

COMMIT;
