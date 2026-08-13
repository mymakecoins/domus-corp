from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UP = (ROOT / "migrations/000014_v1_404_ingestion_pipeline.up.sql").read_text().lower()
DOWN = (ROOT / "migrations/000014_v1_404_ingestion_pipeline.down.sql").read_text().lower()


class IngestionMigrationTest(unittest.TestCase):
    def test_is_scoped_idempotent_and_fenced(self) -> None:
        self.assertIn("force row level security", UP)
        self.assertIn("fencing_token bigint", UP)
        self.assertIn(
            "unique(tenant_id,workspace_id,asset_version_id,parser_profile,parser_version)", UP
        )
        self.assertIn("on delete restrict", UP)

    def test_states_events_and_metadata_are_bounded(self) -> None:
        for value in (
            "retry_wait",
            "succeeded",
            "failed",
            "quarantined",
            "cancelled",
            "knowledge.ingestion.queued.v1",
            "knowledge.ingestion.succeeded.v1",
            "knowledge.ingestion.failed.v1",
        ):
            self.assertIn(value, UP)
        for forbidden in (" prompt ", " document_content ", " normalized_text "):
            self.assertNotIn(forbidden, UP)

    def test_is_reversible(self) -> None:
        self.assertIn("drop table if exists knowledge_ingestion_outbox", DOWN)
        self.assertIn("drop table if exists knowledge_ingestion_job", DOWN)


if __name__ == "__main__":
    unittest.main()
