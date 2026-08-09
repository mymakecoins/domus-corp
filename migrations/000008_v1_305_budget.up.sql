BEGIN;
CREATE TABLE budget_limit(
 tenant_id uuid NOT NULL,budget_id uuid NOT NULL,scope_type text NOT NULL CHECK(scope_type IN('tenant','workspace','user','task','provider')),scope_id text NOT NULL,
 currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),limit_minor bigint NOT NULL CHECK(limit_minor>=0),committed_minor bigint NOT NULL DEFAULT 0 CHECK(committed_minor>=0),reserved_minor bigint NOT NULL DEFAULT 0 CHECK(reserved_minor>=0),
 blocked boolean NOT NULL DEFAULT false,version bigint NOT NULL DEFAULT 1 CHECK(version>0),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(tenant_id,budget_id),UNIQUE(tenant_id,scope_type,scope_id),
 FOREIGN KEY(tenant_id) REFERENCES iam_tenant(tenant_id) ON DELETE RESTRICT,CHECK(committed_minor+reserved_minor<=limit_minor OR blocked)
);
CREATE TABLE budget_reservation(
 tenant_id uuid NOT NULL,reservation_id uuid NOT NULL,workspace_id uuid NOT NULL,user_id uuid NOT NULL,request_id uuid NOT NULL,idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 16 AND 128),fingerprint text NOT NULL CHECK(fingerprint ~ '^sha256:[0-9a-f]{64}$'),
 policy_version text NOT NULL,model_key text NOT NULL,provider_key text NOT NULL,price_version bigint NOT NULL CHECK(price_version>0),currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),reserved_minor bigint NOT NULL CHECK(reserved_minor>=0),actual_minor bigint,
 state text NOT NULL CHECK(state IN('reserved','committed','released','expired','reconciliation_review')),receipt_id text,expires_at timestamptz NOT NULL,reconciled_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(tenant_id,reservation_id),UNIQUE(tenant_id,idempotency_key),FOREIGN KEY(tenant_id,workspace_id) REFERENCES iam_workspace(tenant_id,workspace_id) ON DELETE RESTRICT,FOREIGN KEY(tenant_id,user_id) REFERENCES iam_user(tenant_id,user_id) ON DELETE RESTRICT,
 CHECK((state='reserved' AND actual_minor IS NULL AND receipt_id IS NULL AND reconciled_at IS NULL) OR (state<>'reserved' AND actual_minor IS NOT NULL AND receipt_id IS NOT NULL AND reconciled_at IS NOT NULL))
);
CREATE TABLE budget_reservation_allocation(
 tenant_id uuid NOT NULL,reservation_id uuid NOT NULL,budget_id uuid NOT NULL,reserved_minor bigint NOT NULL CHECK(reserved_minor>=0),PRIMARY KEY(tenant_id,reservation_id,budget_id),
 FOREIGN KEY(tenant_id,reservation_id) REFERENCES budget_reservation(tenant_id,reservation_id) ON DELETE RESTRICT,FOREIGN KEY(tenant_id,budget_id) REFERENCES budget_limit(tenant_id,budget_id) ON DELETE RESTRICT
);
CREATE TABLE budget_ledger_entry(
 tenant_id uuid NOT NULL,entry_id uuid NOT NULL,reservation_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN('reserved','committed','released','overage','expired')),amount_minor bigint NOT NULL CHECK(amount_minor>=0),currency char(3) NOT NULL,receipt_id text,occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(tenant_id,entry_id),
 FOREIGN KEY(tenant_id,reservation_id) REFERENCES budget_reservation(tenant_id,reservation_id) ON DELETE RESTRICT
);
GRANT SELECT,INSERT,UPDATE ON budget_limit,budget_reservation,budget_reservation_allocation TO domus_gateway_runtime;GRANT SELECT,INSERT ON budget_ledger_entry TO domus_gateway_runtime;
ALTER TABLE budget_limit ENABLE ROW LEVEL SECURITY;ALTER TABLE budget_limit FORCE ROW LEVEL SECURITY;ALTER TABLE budget_reservation ENABLE ROW LEVEL SECURITY;ALTER TABLE budget_reservation FORCE ROW LEVEL SECURITY;ALTER TABLE budget_reservation_allocation ENABLE ROW LEVEL SECURITY;ALTER TABLE budget_reservation_allocation FORCE ROW LEVEL SECURITY;ALTER TABLE budget_ledger_entry ENABLE ROW LEVEL SECURITY;ALTER TABLE budget_ledger_entry FORCE ROW LEVEL SECURITY;
CREATE POLICY budget_limit_tenant ON budget_limit TO domus_gateway_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id')) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id'));
CREATE POLICY budget_reservation_scope ON budget_reservation TO domus_gateway_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id')) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id') AND workspace_id=domus_security.current_uuid('app.current_workspace_id') AND user_id=domus_security.current_uuid('app.current_user_id'));
CREATE POLICY budget_allocation_tenant ON budget_reservation_allocation TO domus_gateway_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id')) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id'));
CREATE POLICY budget_ledger_tenant ON budget_ledger_entry TO domus_gateway_runtime USING(tenant_id=domus_security.current_uuid('app.current_tenant_id')) WITH CHECK(tenant_id=domus_security.current_uuid('app.current_tenant_id'));
INSERT INTO schema_migrations(version,description) VALUES(8,'V1-305 atomic budget reservation and reconciliation') ON CONFLICT(version) DO NOTHING;
COMMIT;
