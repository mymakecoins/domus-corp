from __future__ import annotations

import copy
import json
import unittest
from datetime import UTC, datetime
from pathlib import Path

from scripts.check_release import validate

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((ROOT / "release/candidate.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 8, 8, 12, tzinfo=UTC)


class ReleaseGateTest(unittest.TestCase):
    def test_current_candidate_is_valid(self) -> None:
        self.assertEqual([], validate(BASE, NOW))

    def test_open_high_finding_blocks_release(self) -> None:
        candidate = copy.deepcopy(BASE)
        candidate["findings"] = [{"id": "SEC-1", "severity": "high", "status": "open"}]
        self.assertTrue(any("blocks release" in error for error in validate(candidate, NOW)))

    def test_formal_unexpired_acceptance_can_release(self) -> None:
        candidate = copy.deepcopy(BASE)
        candidate["findings"] = [
            {
                "id": "SEC-1",
                "severity": "critical",
                "status": "accepted",
                "acceptance": {
                    "owner": "Human Owner",
                    "role": "Security Lead",
                    "acceptedAt": "2026-08-08T10:00:00Z",
                    "expiresAt": "2026-08-09T10:00:00Z",
                    "justification": "Compensating control documented.",
                },
            }
        ]
        self.assertEqual([], validate(candidate, NOW))

    def test_expired_or_unauthorized_acceptance_blocks(self) -> None:
        candidate = copy.deepcopy(BASE)
        candidate["findings"] = [
            {
                "id": "SEC-1",
                "severity": "critical",
                "status": "accepted",
                "acceptance": {
                    "owner": "Assistant",
                    "role": "Security Lead",
                    "acceptedAt": "2026-08-01T10:00:00Z",
                    "expiresAt": "2026-08-02T10:00:00Z",
                    "justification": "Temporary acceptance has expired.",
                },
            }
        ]
        self.assertTrue(any("expired" in error for error in validate(candidate, NOW)))

    def test_failed_test_and_missing_rollback_block(self) -> None:
        candidate = copy.deepcopy(BASE)
        candidate["tests"][0]["result"] = "failed"
        candidate["rollback"] = {}
        errors = validate(candidate, NOW)
        self.assertTrue(any("tests" in error for error in errors))
        self.assertTrue(any("rollback" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
