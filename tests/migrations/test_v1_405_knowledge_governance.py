from __future__ import annotations
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UP = (ROOT / "migrations/000015_v1_405_knowledge_governance.up.sql").read_text().lower()
DOWN = (ROOT / "migrations/000015_v1_405_knowledge_governance.down.sql").read_text().lower()


class KnowledgeGovernanceMigrationTest(unittest.TestCase):
    def test_one_effective_version_and_forced_rls(self) -> None:
        self.assertIn("unique index one_effective_knowledge_version", UP)
        for table in (
            "knowledge_version_governance",
            "knowledge_version_conflict",
            "knowledge_governance_outbox",
        ):
            self.assertIn(f"alter table {table} force row level security", UP)

    def test_lineage_conflicts_and_events_are_bounded(self) -> None:
        self.assertGreaterEqual(UP.count("on delete restrict"), 4)
        for value in (
            "pending_review",
            "effective",
            "conflicted",
            "superseded",
            "knowledge.version.conflict_resolved.v1",
        ):
            self.assertIn(value, UP)
        for forbidden in (" document_content ", " normalized_text ", " justification "):
            self.assertNotIn(forbidden, UP)

    def test_is_reversible(self) -> None:
        for table in (
            "knowledge_governance_outbox",
            "knowledge_version_conflict",
            "knowledge_version_governance",
        ):
            self.assertIn(f"drop table if exists {table}", DOWN)


if __name__ == "__main__":
    unittest.main()
