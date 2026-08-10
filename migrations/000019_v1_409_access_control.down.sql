BEGIN; DROP TABLE IF EXISTS knowledge_access_audit; DELETE FROM schema_migrations WHERE version=19; COMMIT;
