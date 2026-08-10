from __future__ import annotations
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UP = (ROOT / "migrations/000016_v1_406_content_safety.up.sql").read_text().lower()
DOWN = (ROOT / "migrations/000016_v1_406_content_safety.down.sql").read_text().lower()


class ContentSafetyMigrationTest(unittest.TestCase):
    def test_untrusted_decisions_are_scoped_and_immutable_by_identity(self) -> None:
        self.assertIn("trust_origin='untrusted_external_data'", UP)
        self.assertIn(
            "unique(tenant_id,workspace_id,version_id,normalized_checksum,scanner_profile,scanner_version)",
            UP,
        )
        for table in ("knowledge_safety_assessment", "knowledge_safety_outbox"):
            self.assertIn(f"alter table {table} force row level security", UP)

    def test_review_and_events_do_not_store_content(self) -> None:
        for value in (
            "review_required",
            "quarantine",
            "knowledge.safety.released.v1",
            "review_reason_hash",
        ):
            self.assertIn(value, UP)
        for forbidden in (" content text", " excerpt ", " justification ", " prompt "):
            self.assertNotIn(forbidden, UP)

    def test_is_reversible(self) -> None:
        self.assertIn("drop table if exists knowledge_safety_outbox", DOWN)
        self.assertIn("drop table if exists knowledge_safety_assessment", DOWN)


if __name__ == "__main__":
    unittest.main()
