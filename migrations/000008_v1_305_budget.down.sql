BEGIN;DROP TABLE budget_ledger_entry;DROP TABLE budget_reservation_allocation;DROP TABLE budget_reservation;DROP TABLE budget_limit;DELETE FROM schema_migrations WHERE version=8;COMMIT;
