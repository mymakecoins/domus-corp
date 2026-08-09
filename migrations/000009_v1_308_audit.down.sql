BEGIN;DROP TABLE audit_access_event;DROP TABLE audit_event;DELETE FROM schema_migrations WHERE version=9;COMMIT;
