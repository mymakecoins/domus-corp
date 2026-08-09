from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
UP=ROOT/"migrations/000011_v1_401_source_registry.up.sql"
DOWN=ROOT/"migrations/000011_v1_401_source_registry.down.sql"
class SourceRegistryMigrationTest(unittest.TestCase):
    def setUp(self)->None:
        self.up=UP.read_text(encoding="utf-8").lower();self.down=DOWN.read_text(encoding="utf-8").lower()
    def test_governed_metadata_and_lineage_are_constrained(self)->None:
        for field in ("owner_user_id","classification","freshness_sla_seconds","retention_days","origin_system_key","connector_key","status"):
            self.assertIn(field,self.up)
        self.assertGreaterEqual(self.up.count("on delete restrict"),4)
        self.assertIn("status<>'active'",self.up)
    def test_all_runtime_tables_force_rls_and_use_transaction_scope(self)->None:
        for table in ("source_registry","source_registry_audit","source_registry_outbox"):
            self.assertIn(f"alter table {table} force row level security",self.up)
        self.assertIn("app.current_tenant_id",self.up);self.assertIn("app.current_workspace_id",self.up)
    def test_lifecycle_events_are_bounded_and_reversible(self)->None:
        for event in ("source.created.v1","source.activated.v1","source.paused.v1","source.disconnected.v1"):
            self.assertIn(event,self.up)
        for table in ("source_registry_outbox","source_registry_audit","source_registry"):
            self.assertIn(f"drop table if exists {table}",self.down)
if __name__=="__main__":unittest.main()
