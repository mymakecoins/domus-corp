BEGIN;
CREATE INDEX idx_knowledge_embedding_version ON knowledge_embedding(tenant_id, workspace_id, index_version, status);
CREATE INDEX idx_knowledge_chunk_scope ON knowledge_chunk(tenant_id, workspace_id, classification, valid_until);
INSERT INTO schema_migrations(version,description) VALUES(24,'V1-704 Qdrant, PostgreSQL and reindex optimization') ON CONFLICT(version) DO NOTHING;
COMMIT;
