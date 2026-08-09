from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000009_v1_308_audit.up.sql").read_text().lower();DOWN=(ROOT/"migrations/000009_v1_308_audit.down.sql").read_text().lower()
class AuditMigrationTest(unittest.TestCase):
 def test_append_only_partitioned_and_self_audited(self):
  self.assertIn("partition by range",UP);self.assertIn("create table audit_access_event",UP);self.assertNotIn("grant update",UP);self.assertIn("purpose text not null",UP)
 def test_rls_retention_and_rollback(self):
  self.assertEqual(UP.count("force row level security"),2);self.assertIn("interval '30 days'",UP);self.assertIn("drop table audit_event",DOWN)
if __name__=="__main__":unittest.main()
