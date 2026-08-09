BEGIN;

DROP TABLE IF EXISTS iam_outbox_event;
DROP TABLE IF EXISTS iam_auth_session;
DROP TABLE IF EXISTS iam_workspace_membership;
DROP TABLE IF EXISTS iam_workspace;
DROP TABLE IF EXISTS iam_device;
DROP TABLE IF EXISTS iam_user_identity_link;
DROP TABLE IF EXISTS iam_external_identity;
DROP TABLE IF EXISTS iam_user;
DROP TABLE IF EXISTS iam_tenant;
DROP FUNCTION IF EXISTS domus_security.current_uuid(text);
DROP SCHEMA IF EXISTS domus_security;
DROP ROLE IF EXISTS domus_identity_runtime;

DELETE FROM schema_migrations WHERE version = 2;

COMMIT;
