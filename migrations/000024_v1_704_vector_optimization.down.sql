BEGIN;
DROP INDEX IF EXISTS idx_knowledge_embedding_version;
DROP INDEX IF EXISTS idx_knowledge_chunk_scope;
DELETE FROM schema_migrations WHERE version=24;
COMMIT;
