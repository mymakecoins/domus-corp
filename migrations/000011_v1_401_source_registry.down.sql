BEGIN;
DELETE FROM schema_migrations WHERE version=11;
DROP TABLE IF EXISTS source_registry_outbox;
DROP TABLE IF EXISTS source_registry_audit;
DROP TABLE IF EXISTS source_registry;
COMMIT;
