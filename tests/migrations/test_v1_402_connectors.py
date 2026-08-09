from __future__ import annotations
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];UP=(ROOT/"migrations/000012_v1_402_connectors.up.sql").read_text(encoding="utf-8").lower();DOWN=(ROOT/"migrations/000012_v1_402_connectors.down.sql").read_text(encoding="utf-8").lower()
class ConnectorMigrationTest(unittest.TestCase):
    def test_cursor_is_fenced_bounded_and_secret_free(self)->None:
        for field in ("cursor_version","fencing_token","lease_owner","lease_expires_at","credential_ref"):
            self.assertIn(field,UP)
        self.assertIn("octet_length(cursor_value)<=8192",UP);self.assertNotIn("access_token",UP);self.assertNotIn("refresh_token",UP)
    def test_dedupe_dead_letter_and_events_preserve_lineage(self)->None:
        for table in ("connector_item_dedupe","connector_dead_letter","connector_sync_outbox"):
            self.assertIn(f"create table {table}",UP);self.assertIn(f"alter table {table} force row level security",UP);self.assertIn(f"drop table if exists {table}",DOWN)
        self.assertIn("on delete restrict",UP);self.assertIn("source.sync.dead_lettered.v1",UP)
    def test_ineligible_source_pauses_connection(self)->None:
        self.assertIn("pause_source_connection_when_ineligible",UP);self.assertIn("new.status<>'active'",UP);self.assertIn("lease_owner=null",UP)
if __name__=="__main__":unittest.main()
