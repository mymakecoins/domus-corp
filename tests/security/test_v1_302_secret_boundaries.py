from __future__ import annotations
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

class SecretBoundaryTest(unittest.TestCase):
    def test_gateway_policy_is_read_only_and_scoped(self):
        policy=(ROOT/"infra/vault/policies/domus-model-gateway.hcl").read_text(encoding="utf-8")
        self.assertIn('capabilities = ["read"]',policy)
        self.assertNotIn("create",policy); self.assertNotIn("update",policy); self.assertNotIn("delete",policy)
        self.assertIn("provider-credentials/+/versions/+",policy)
    def test_runtime_has_no_raw_provider_environment_contract(self):
        config=(ROOT/"apps/control-plane/src/config.ts").read_text(encoding="utf-8")
        self.assertIn("raw provider credentials are forbidden",config)
        self.assertIn("VAULT_TOKEN_FILE",config)
    def test_persisted_and_audited_shapes_exclude_secret_material(self):
        migration=(ROOT/"migrations/000005_v1_302_credentials.up.sql").read_text(encoding="utf-8").lower()
        for forbidden in ("api_key", "access_token", "refresh_token", "secret_value"):
            self.assertNotIn(forbidden,migration)

if __name__=="__main__": unittest.main()
