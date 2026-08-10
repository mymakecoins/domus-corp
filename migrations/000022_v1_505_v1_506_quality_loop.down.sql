BEGIN;
DROP TABLE IF EXISTS knowledge_gaps;
DROP TABLE IF EXISTS quality_loop_suggestions;
DROP TABLE IF EXISTS feedback_records;
DELETE FROM schema_migrations WHERE version=22;
COMMIT;
