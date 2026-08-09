from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
UP = ROOT / "migrations/000003_v1_102_tenancy.up.sql"
DOWN = ROOT / "migrations/000003_v1_102_tenancy.down.sql"


class TenancyMigrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.up = UP.read_text(encoding="utf-8").lower()
        self.down = DOWN.read_text(encoding="utf-8").lower()

    def test_adds_tenant_admin_and_governed_workspace_fields(self) -> None:
        self.assertIn("create table if not exists iam_tenant_role", self.up)
        for field in ("domain_key", "policy_id", "classification_clearance"):
            self.assertIn(field, self.up)

    def test_tenant_role_and_workspace_rls_are_forced(self) -> None:
        self.assertIn("alter table iam_tenant_role force row level security", self.up)
        self.assertIn("app.current_tenant_id", self.up)
        self.assertIn("app.current_user_id", self.up)
        self.assertIn("role = 'admin'", self.up)

    def test_tenancy_events_are_allowed_in_transactional_outbox(self) -> None:
        for event in ("workspace.created.v1", "workspace.archived.v1", "workspace.membership_changed.v1"):
            self.assertIn(event, self.up)

    def test_down_restores_previous_shape(self) -> None:
        self.assertIn("drop table if exists iam_tenant_role", self.down)
        for field in ("domain_key", "policy_id", "classification_clearance"):
            self.assertIn(f"drop column if exists {field}", self.down)


if __name__ == "__main__":
    unittest.main()
