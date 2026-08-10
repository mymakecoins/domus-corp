BEGIN; DROP TABLE IF EXISTS knowledge_retrieval_audit; DELETE FROM schema_migrations WHERE version=21; COMMIT;
