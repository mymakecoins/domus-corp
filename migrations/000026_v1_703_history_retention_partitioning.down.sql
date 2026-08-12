BEGIN;
DROP TABLE IF EXISTS history_archive_receipt CASCADE;
DROP FUNCTION IF EXISTS create_monthly_partition(text, integer, integer);
DELETE FROM schema_migrations WHERE version = 26;
COMMIT;
