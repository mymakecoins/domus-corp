from __future__ import annotations

import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000007_v1_304_egress.up.sql").read_text(encoding="utf-8").lower();DOWN=(ROOT/"migrations/000007_v1_304_egress.down.sql").read_text(encoding="utf-8").lower()
class EgressMigrationTest(unittest.TestCase):
 def test_versions_rules_exceptions_and_redacted_audit(self):
  for table in ("egress_rule","egress_exception","egress_guard_audit"):self.assertIn(f"create table {table}",UP)
  for forbidden in ("original_payload","redacted_payload","matched_value","prompt","response_content"):self.assertNotIn(forbidden,UP)
 def test_limits_exceptions_and_forces_rls(self):
  self.assertIn("interval '30 days'",UP);self.assertIn("owner <> approver",UP);self.assertIn("force row level security",UP)
 def test_is_reversible(self):
  for table in ("egress_guard_audit","egress_exception","egress_rule"):self.assertIn(f"drop table {table}",DOWN)
if __name__=="__main__":unittest.main()
