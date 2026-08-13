from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UP = (ROOT / "migrations/000018_v1_408_knowledge_graph.up.sql").read_text().lower()
DOWN = (ROOT / "migrations/000018_v1_408_knowledge_graph.down.sql").read_text().lower()


class KnowledgeGraphMigrationTest(unittest.TestCase):
    def test_evidence_claims_and_graph_force_rls(self) -> None:
        self.assertGreaterEqual(UP.count("force row level security"), 6)
        self.assertGreaterEqual(UP.count("on delete restrict"), 6)
        self.assertIn("position between 0 and 49", UP)

    def test_claim_kinds_lineage_and_events_are_bounded(self) -> None:
        for value in (
            "'fact','inference','rule_candidate'",
            "excerpt_hash",
            "statement_ref",
            "knowledge.evidence.invalidated.v1",
        ):
            self.assertIn(value, UP)
        self.assertNotIn("statement text", UP)
        self.assertNotIn("excerpt text", UP)

    def test_is_reversible(self) -> None:
        for table in (
            "knowledge_graph_outbox",
            "knowledge_relation",
            "knowledge_claim_evidence",
            "knowledge_claim",
            "knowledge_entity",
            "knowledge_evidence",
        ):
            self.assertIn(f"drop table if exists {table}", DOWN)


if __name__ == "__main__":
    unittest.main()
