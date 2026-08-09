BEGIN;DROP TABLE egress_guard_audit;DROP TABLE egress_exception;DROP TABLE egress_rule;DELETE FROM schema_migrations WHERE version=7;COMMIT;
