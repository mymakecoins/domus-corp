from __future__ import annotations
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
UP=(ROOT/"migrations/000005_v1_302_credentials.up.sql").read_text(encoding="utf-8").lower()
DOWN=(ROOT/"migrations/000005_v1_302_credentials.down.sql").read_text(encoding="utf-8").lower()

class CredentialMigrationTest(unittest.TestCase):
    def test_persists_only_metadata_and_opaque_reference(self):
        self.assertIn("create table provider_credential_binding",UP)
        self.assertIn("secret_reference",UP)
        for forbidden in ("api_key", "access_token", "refresh_token", "secret_value"):
            self.assertNotIn(forbidden,UP)
    def test_enforces_one_active_version_and_monotonic_states(self):
        self.assertIn("provider_one_active_credential",UP)
        self.assertIn("pending",UP); self.assertIn("active",UP); self.assertIn("revoked",UP)
        self.assertIn("provider_credential_state_guard",UP)
    def test_separates_gateway_read_from_admin_write(self):
        self.assertIn("domus_gateway_runtime",UP)
        self.assertIn("domus_credential_admin",UP)
        self.assertIn("force row level security",UP)
    def test_is_reversible(self):
        self.assertIn("drop table provider_credential_audit",DOWN)
        self.assertIn("drop table provider_credential_binding",DOWN)

if __name__=="__main__": unittest.main()
