BEGIN;DROP TABLE cost_threshold_event;DROP TABLE cost_ledger_entry;DROP FUNCTION enforce_cost_ledger_transition();DELETE FROM schema_migrations WHERE version=10;COMMIT;
