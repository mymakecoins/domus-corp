\set ON_ERROR_STOP on
SET ROLE domus_egress_admin;
INSERT INTO egress_rule(rule_id,version,ruleset_version,kind,detector,action,state,published_at,owner,justification) VALUES('91919191-9191-4191-8191-919191919191',1,1,'pii','email','mask','published',clock_timestamp(),'synthetic-owner','test only');
INSERT INTO egress_exception(tenant_id,workspace_id,exception_id,version,provider_key,model_key,pii_types,owner,approver,justification,valid_from,expires_at,state) VALUES('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','92929292-9292-4292-8292-929292929292',1,'provider-a','model-a',ARRAY['email'],'owner-a','security-b','test only',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 day','active');
RESET ROLE;
SET ROLE domus_gateway_runtime;
DO $$ BEGIN IF(SELECT count(*) FROM egress_exception)<>0 THEN RAISE EXCEPTION 'exception must fail closed without context';END IF;END $$;
BEGIN;SET LOCAL app.current_tenant_id='22222222-2222-4222-8222-222222222222';SET LOCAL app.current_workspace_id='33333333-3333-4333-8333-333333333333';
DO $$ BEGIN IF(SELECT count(*) FROM egress_exception)<>1 THEN RAISE EXCEPTION 'scoped exception must be visible';END IF;END $$;ROLLBACK;RESET ROLE;
SELECT 'OK: V1-304 exceptions fail closed outside scoped context' AS result;
