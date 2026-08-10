BEGIN;DROP TABLE IF EXISTS knowledge_ingestion_outbox;DROP TABLE IF EXISTS knowledge_ingestion_job;DELETE FROM schema_migrations WHERE version=14;COMMIT;
