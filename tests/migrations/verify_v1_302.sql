\set ON_ERROR_STOP on

SET ROLE domus_credential_admin;
INSERT INTO provider_credential_binding
  (credential_id,provider_key,version,state,secret_reference,created_at,created_by,last_tested_at,last_test_result)
VALUES
  ('81818181-8181-4181-8181-818181818181','synthetic-provider',1,'pending','opaque-reference',clock_timestamp(),'synthetic-operator',clock_timestamp(),'passed');
UPDATE provider_credential_binding SET state='active',activated_at=clock_timestamp()
 WHERE credential_id='81818181-8181-4181-8181-818181818181';
RESET ROLE;

SET ROLE domus_gateway_runtime;
DO $$ BEGIN
  IF (SELECT count(*) FROM provider_credential_binding WHERE provider_key='synthetic-provider') <> 1 THEN
    RAISE EXCEPTION 'gateway must see exactly one active reference';
  END IF;
END $$;
RESET ROLE;

SET ROLE domus_credential_admin;
UPDATE provider_credential_binding SET state='revoked',revoked_at=clock_timestamp()
 WHERE credential_id='81818181-8181-4181-8181-818181818181';
RESET ROLE;

SET ROLE domus_gateway_runtime;
DO $$ BEGIN
  IF (SELECT count(*) FROM provider_credential_binding WHERE provider_key='synthetic-provider') <> 0 THEN
    RAISE EXCEPTION 'revoked reference must fail closed';
  END IF;
END $$;
RESET ROLE;

SELECT 'OK: V1-302 separates credential administration and runtime use' AS result;
