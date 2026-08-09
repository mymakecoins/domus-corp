BEGIN;
DROP TABLE provider_credential_audit;
DROP TRIGGER provider_credential_state_guard ON provider_credential_binding;
DROP TABLE provider_credential_binding;
DROP FUNCTION domus_security.provider_credential_state_guard();
DELETE FROM schema_migrations WHERE version = 5;
COMMIT;
