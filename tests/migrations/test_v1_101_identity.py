from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
UP = ROOT / "migrations/000002_v1_101_identity.up.sql"
DOWN = ROOT / "migrations/000002_v1_101_identity.down.sql"

TABLES = {
    "iam_tenant",
    "iam_user",
    "iam_external_identity",
    "iam_user_identity_link",
    "iam_device",
    "iam_workspace",
    "iam_workspace_membership",
    "iam_auth_session",
    "iam_outbox_event",
}

TENANT_SCOPED = TABLES - {"iam_external_identity"}


class IdentityMigrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.up = UP.read_text(encoding="utf-8").lower()
        self.down = DOWN.read_text(encoding="utf-8").lower()

    def test_creates_only_the_approved_identity_tables(self) -> None:
        for table in TABLES:
            self.assertIn(f"create table if not exists {table}", self.up)
        for forbidden in ("knowledge_asset", "claim", "insight", "action_request", "usage_ledger"):
            self.assertNotIn(f"create table {forbidden}", self.up)

    def test_external_subject_is_global_and_links_to_tenant_users(self) -> None:
        self.assertIn("unique (issuer, external_subject)", self.up)
        self.assertIn("foreign key (tenant_id, user_id)", self.up)
        self.assertIn("references iam_user (tenant_id, user_id)", self.up)
        self.assertIn("unique (external_identity_id, tenant_id)", self.up)

    def test_sensitive_tenant_tables_force_rls(self) -> None:
        for table in TENANT_SCOPED:
            self.assertIn(f"alter table {table} enable row level security", self.up)
            self.assertIn(f"alter table {table} force row level security", self.up)
        self.assertIn("current_setting(setting_name, true)", self.up)
        self.assertIn("exception when invalid_text_representation", self.up)

    def test_runtime_role_cannot_bypass_rls(self) -> None:
        self.assertIn("create role domus_identity_runtime nologin nobypassrls", self.up)
        self.assertNotIn("bypassrls", self.up.replace("nobypassrls", ""))
        self.assertIn("revoke all on iam_external_identity from public", self.up)

    def test_sessions_and_devices_preserve_revocation_metadata(self) -> None:
        for field in ("revoked_at", "revoked_by", "revocation_reason", "version"):
            self.assertIn(field, self.up)
        self.assertIn("check (status in ('pending', 'active', 'revoked'))", self.up)

    def test_down_removes_every_created_object(self) -> None:
        for table in TABLES:
            self.assertIn(f"drop table if exists {table}", self.down)
        self.assertIn("drop role if exists domus_identity_runtime", self.down)
        self.assertIn("drop schema if exists domus_security", self.down)


if __name__ == "__main__":
    unittest.main()
