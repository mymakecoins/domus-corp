\set ON_ERROR_STOP on

INSERT INTO iam_tenant (tenant_id, name, status, default_classification) VALUES
    ('22222222-2222-4222-8222-222222222222', 'Tenant A', 'active', 'internal'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tenant B', 'active', 'internal');

INSERT INTO iam_user (tenant_id, user_id, status) VALUES
    ('22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555555555', 'active'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'active');

INSERT INTO iam_external_identity (external_identity_id, issuer, external_subject, claims_hash) VALUES
    ('90909090-9090-4090-8090-909090909090', 'https://idp.example.test', 'synthetic-user', 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

INSERT INTO iam_user_identity_link (tenant_id, user_id, external_identity_id) VALUES
    ('22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555555555', '90909090-9090-4090-8090-909090909090'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '90909090-9090-4090-8090-909090909090');

INSERT INTO iam_device (tenant_id, device_id, user_id, public_key_thumbprint, status, registered_at, activated_at) VALUES
    ('22222222-2222-4222-8222-222222222222', '20202020-2020-4020-8020-202020202020', '55555555-5555-4555-8555-555555555555', 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'active', clock_timestamp(), clock_timestamp()),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '21212121-2121-4121-8121-212121212121', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'sha256:ccccccccccccccccccccccccccccccccccccccccccc', 'active', clock_timestamp(), clock_timestamp());

INSERT INTO iam_workspace (tenant_id, workspace_id, owner_user_id, name, status, default_classification) VALUES
    ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555', 'Workspace A', 'active', 'internal'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '31313131-3131-4131-8131-313131313131', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Workspace B', 'active', 'internal');

DO $$
BEGIN
    IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'domus_identity_runtime') THEN
        RAISE EXCEPTION 'identity runtime must not bypass RLS';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname LIKE 'iam_%' AND relname <> 'iam_external_identity'
          AND relkind = 'r' AND (NOT relrowsecurity OR NOT relforcerowsecurity)
    ) THEN
        RAISE EXCEPTION 'tenant-scoped IAM table lacks forced RLS';
    END IF;
END
$$;

SET ROLE domus_identity_runtime;

DO $$
BEGIN
    IF (SELECT count(*) FROM iam_user) <> 0 THEN
        RAISE EXCEPTION 'missing context must return zero tenant users';
    END IF;
    IF (SELECT count(*) FROM iam_user_identity_link) <> 2 THEN
        RAISE EXCEPTION 'IAM identity resolution must return both eligible tenant links';
    END IF;
END
$$;

BEGIN;
SET LOCAL app.current_tenant_id = 'not-a-uuid';
DO $$
BEGIN
    IF (SELECT count(*) FROM iam_user) <> 0 THEN
        RAISE EXCEPTION 'invalid tenant context must fail closed';
    END IF;
END
$$;
ROLLBACK;

BEGIN;
SET LOCAL app.current_tenant_id = '22222222-2222-4222-8222-222222222222';
SET LOCAL app.current_user_id = '55555555-5555-4555-8555-555555555555';
SET LOCAL app.current_workspace_id = '33333333-3333-4333-8333-333333333333';
DO $$
BEGIN
    IF (SELECT count(*) FROM iam_user) <> 1 THEN
        RAISE EXCEPTION 'tenant A must see exactly one user';
    END IF;
    IF (SELECT count(*) FROM iam_device) <> 1 THEN
        RAISE EXCEPTION 'tenant A actor must see exactly one device';
    END IF;
    IF (SELECT count(*) FROM iam_workspace) <> 1 THEN
        RAISE EXCEPTION 'tenant A must see exactly one selected workspace';
    END IF;
    IF EXISTS (SELECT 1 FROM iam_user WHERE tenant_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
        RAISE EXCEPTION 'cross-tenant user escaped RLS';
    END IF;
END
$$;
ROLLBACK;

RESET ROLE;

DO $$
BEGIN
    BEGIN
        SET LOCAL ROLE domus_identity_runtime;
        CREATE TABLE ddl_escape_attempt (id uuid);
        RAISE EXCEPTION 'identity runtime unexpectedly executed DDL';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END
$$;

DO $$
BEGIN
    BEGIN
        SET LOCAL ROLE domus_identity_runtime;
        PERFORM set_config('app.current_tenant_id', '22222222-2222-4222-8222-222222222222', true);
        INSERT INTO iam_user (tenant_id, user_id, status)
        VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'active');
        RAISE EXCEPTION 'cross-tenant insert unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END
$$;

SELECT 'OK: V1-101 PostgreSQL isolation and multi-tenant identity links' AS result;
