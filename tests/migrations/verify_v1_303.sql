\set ON_ERROR_STOP on
SET ROLE domus_catalog_admin;
INSERT INTO model_provider_catalog(provider_key,version,status,maximum_classification,owner,justification,published_at) VALUES('synthetic-provider',1,'active','confidential','synthetic-owner','test only',clock_timestamp());
INSERT INTO model_catalog(model_key,version,provider_key,provider_version,status,capabilities,maximum_classification,context_window_tokens,maximum_output_tokens,price_version,currency,input_minor_per_million_tokens,output_minor_per_million_tokens,route_priority,owner,justification,published_at) VALUES('synthetic-model',1,'synthetic-provider',1,'active',ARRAY['CHAT'],'confidential',10000,1000,1,'BRL',100,200,100,'synthetic-owner','test only',clock_timestamp());
RESET ROLE;
SET ROLE domus_gateway_runtime;
DO $$ BEGIN IF (SELECT count(*) FROM model_catalog WHERE model_key='synthetic-model')<>1 THEN RAISE EXCEPTION 'gateway must see active model';END IF;END $$;
RESET ROLE;
SET ROLE domus_catalog_admin;UPDATE model_catalog SET status='disabled' WHERE model_key='synthetic-model' AND version=1;RESET ROLE;
SET ROLE domus_gateway_runtime;
DO $$ BEGIN IF (SELECT count(*) FROM model_catalog WHERE model_key='synthetic-model')<>0 THEN RAISE EXCEPTION 'disabled model must fail closed';END IF;END $$;
RESET ROLE;
SELECT 'OK: V1-303 exposes only active catalog entries' AS result;
