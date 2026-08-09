from __future__ import annotations
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
UP=(ROOT/"migrations/000004_v1_103_policy.up.sql").read_text(encoding="utf-8").lower()
DOWN=(ROOT/"migrations/000004_v1_103_policy.down.sql").read_text(encoding="utf-8").lower()

class PolicyMigrationTest(unittest.TestCase):
    def test_persists_versioned_layers_and_redacted_evaluations(self):
        self.assertIn("create table if not exists governance_policy_layer",UP)
        self.assertIn("create table if not exists governance_policy_evaluation",UP)
        self.assertNotIn("prompt",UP); self.assertNotIn("response_content",UP)
    def test_forces_rls_and_one_published_layer_per_scope(self):
        self.assertIn("force row level security",UP)
        self.assertIn("governance_one_published_policy_per_scope",UP)
        self.assertIn("app.current_workspace_id",UP)
    def test_is_reversible(self):
        self.assertIn("drop table if exists governance_policy_evaluation",DOWN)
        self.assertIn("drop table if exists governance_policy_layer",DOWN)

if __name__=="__main__": unittest.main()
