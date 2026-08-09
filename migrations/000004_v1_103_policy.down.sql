BEGIN;
DROP TABLE IF EXISTS governance_policy_evaluation;
DROP TABLE IF EXISTS governance_policy_layer;
DELETE FROM schema_migrations WHERE version = 4;
COMMIT;
