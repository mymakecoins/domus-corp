\set ON_ERROR_STOP on

INSERT INTO governance_policy_layer (policy_id, version, scope, state, rules, published_at) VALUES
('70707070-7070-4070-8070-707070707070',1,'global','published','{}',clock_timestamp());
INSERT INTO governance_policy_layer (policy_id, version, scope, tenant_id, state, rules, published_at, published_by) VALUES
('71717171-7171-4171-8171-717171717171',1,'tenant','22222222-2222-4222-8222-222222222222','published','{}',clock_timestamp(),'55555555-5555-4555-8555-555555555555');
INSERT INTO governance_policy_layer (policy_id, version, scope, tenant_id, workspace_id, state, rules, published_at, published_by) VALUES
('72727272-7272-4272-8272-727272727272',1,'workspace','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','published','{}',clock_timestamp(),'55555555-5555-4555-8555-555555555555');
INSERT INTO governance_policy_layer (policy_id, version, scope, tenant_id, workspace_id, role, state, rules, published_at, published_by) VALUES
('73737373-7373-4373-8373-737373737373',1,'role','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','owner','published','{}',clock_timestamp(),'55555555-5555-4555-8555-555555555555');

SET ROLE domus_identity_runtime;
DO $$ BEGIN
  IF (SELECT count(*) FROM governance_policy_layer) <> 0 THEN
    RAISE EXCEPTION 'policy must fail closed without context';
  END IF;
END $$;
BEGIN;
SET LOCAL app.current_tenant_id='22222222-2222-4222-8222-222222222222';
SET LOCAL app.current_workspace_id='33333333-3333-4333-8333-333333333333';
SET LOCAL app.current_user_id='55555555-5555-4555-8555-555555555555';
DO $$ BEGIN
  IF (SELECT count(*) FROM governance_policy_layer) <> 4 THEN
    RAISE EXCEPTION 'eligible actor must resolve exactly four layers';
  END IF;
END $$;
ROLLBACK;
RESET ROLE;

SELECT 'OK: V1-103 policy layers fail closed under RLS' AS result;
