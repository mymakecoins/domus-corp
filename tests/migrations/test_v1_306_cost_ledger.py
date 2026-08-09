from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000010_v1_306_cost_ledger.up.sql").read_text().lower();DOWN=(ROOT/"migrations/000010_v1_306_cost_ledger.down.sql").read_text().lower()
class CostLedgerMigrationTest(unittest.TestCase):
 def test_versions_cost_receipt_dimensions_and_alerts(self):
  self.assertIn("create table cost_ledger_entry",UP);self.assertIn("unique(tenant_id,reservation_id)",UP);self.assertIn("unique(tenant_id,receipt_id)",UP);self.assertIn("create table cost_threshold_event",UP);self.assertIn("threshold in(80,100)",UP)
 def test_rls_and_rollback(self):
  self.assertEqual(UP.count("force row level security"),2);self.assertIn("drop table cost_ledger_entry",DOWN)
if __name__=="__main__":unittest.main()
