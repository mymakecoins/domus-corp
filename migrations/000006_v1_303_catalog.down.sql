BEGIN;
DROP TABLE model_catalog_audit;
DROP TABLE model_fallback;
DROP TABLE model_catalog;
DROP TABLE model_provider_catalog;
DELETE FROM schema_migrations WHERE version=6;
COMMIT;
