BEGIN; DROP TABLE IF EXISTS knowledge_embedding; DROP TABLE IF EXISTS knowledge_chunk; DELETE FROM schema_migrations WHERE version=20; COMMIT;
