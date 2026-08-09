from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000013_v1_403_knowledge_objects.up.sql").read_text(encoding="utf-8").lower();DOWN=(ROOT/"migrations/000013_v1_403_knowledge_objects.down.sql").read_text(encoding="utf-8").lower()
class KnowledgeObjectMigrationTest(unittest.TestCase):
    def test_runtime_isolated_and_rls_forced(self)->None:
        self.assertIn("domus_knowledge_runtime nologin nobypassrls",UP)
        for table in("knowledge_asset","knowledge_asset_version","knowledge_object_audit","knowledge_object_outbox"):
            self.assertIn(f"alter table {table} force row level security",UP)
        self.assertIn("app.current_tenant_id",UP);self.assertIn("app.current_workspace_id",UP)
    def test_identity_is_immutable_and_lineage_restricted(self)->None:
        self.assertIn("protect_knowledge_object_identity",UP);self.assertIn("knowledge_object_immutable",UP)
        for field in("checksum","object_key","object_version","size_bytes","classification","retention_days"):
            self.assertIn(field,UP)
        self.assertGreaterEqual(UP.count("on delete restrict"),4)
    def test_lifecycle_is_audited_and_reversible(self)->None:
        for event in("knowledge.object.accepted.v1","knowledge.object.quarantined.v1","knowledge.object.deleted.v1","knowledge.object.restore_verified.v1"):
            self.assertIn(event,UP)
        for table in("knowledge_object_outbox","knowledge_object_audit","knowledge_asset_version","knowledge_asset"):
            self.assertIn(f"drop table if exists {table}",DOWN)
if __name__=="__main__":unittest.main()
