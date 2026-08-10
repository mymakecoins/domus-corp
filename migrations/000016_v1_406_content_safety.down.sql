BEGIN;DROP TABLE IF EXISTS knowledge_safety_outbox;DROP TABLE IF EXISTS knowledge_safety_assessment;DELETE FROM schema_migrations WHERE version=16;COMMIT;
