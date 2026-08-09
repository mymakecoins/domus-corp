from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000008_v1_305_budget.up.sql").read_text(encoding="utf-8").lower();DOWN=(ROOT/"migrations/000008_v1_305_budget.down.sql").read_text(encoding="utf-8").lower()
class BudgetMigrationTest(unittest.TestCase):
 def test_financial_state_and_idempotency(self):
  for table in ("budget_limit","budget_reservation","budget_reservation_allocation","budget_ledger_entry"):self.assertIn(f"create table {table}",UP)
  self.assertIn("unique(tenant_id,idempotency_key)",UP);self.assertIn("bigint",UP);self.assertIn("for update",(ROOT/"apps/control-plane/src/infrastructure/postgres/budget-repository.ts").read_text().lower())
 def test_forces_rls_and_is_reversible(self):
  self.assertEqual(UP.count("force row level security"),4)
  for table in ("budget_ledger_entry","budget_reservation_allocation","budget_reservation","budget_limit"):self.assertIn(f"drop table {table}",DOWN)
if __name__=="__main__":unittest.main()
