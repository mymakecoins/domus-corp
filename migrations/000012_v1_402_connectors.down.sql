BEGIN;
DROP TRIGGER IF EXISTS source_connection_source_state ON source_registry;DROP FUNCTION IF EXISTS pause_source_connection_when_ineligible();DROP TABLE IF EXISTS connector_sync_outbox;DROP TABLE IF EXISTS connector_dead_letter;DROP TABLE IF EXISTS connector_item_dedupe;DROP TABLE IF EXISTS source_connection;DELETE FROM schema_migrations WHERE version=12;
COMMIT;
