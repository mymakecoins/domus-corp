from __future__ import annotations
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UP = (ROOT / "migrations/000017_v1_407_taxonomy.up.sql").read_text().lower()
DOWN = (ROOT / "migrations/000017_v1_407_taxonomy.down.sql").read_text().lower()


class TaxonomyMigrationTest(unittest.TestCase):
    def test_published_version_rls_and_lineage(self) -> None:
        self.assertIn("unique index one_published_taxonomy_version", UP)
        self.assertGreaterEqual(UP.count("force row level security"), 5)
        self.assertGreaterEqual(UP.count("on delete restrict"), 6)

    def test_assignments_reprocessing_and_events_are_bounded(self) -> None:
        for value in (
            "model_suggestion",
            "fencing_token",
            "knowledge.taxonomy.published.v1",
            "jsonb_array_length(term_keys)between 1 and 20",
        ):
            self.assertIn(value, UP)

    def test_is_reversible(self) -> None:
        for table in (
            "knowledge_taxonomy_outbox",
            "knowledge_taxonomy_reprocessing",
            "knowledge_taxonomy_assignment",
            "knowledge_taxonomy_term",
            "knowledge_taxonomy_version",
        ):
            self.assertIn(f"drop table if exists {table}", DOWN)


if __name__ == "__main__":
    unittest.main()
