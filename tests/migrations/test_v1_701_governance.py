from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.migration_governance import MigrationViolation, validate_migrations


ROOT = Path(__file__).resolve().parents[2]


class MigrationGovernanceTest(unittest.TestCase):
    def test_repository_migrations_have_complete_governance_metadata(self) -> None:
        report = validate_migrations(ROOT / "migrations", ROOT / "migrations/manifest.json")
        self.assertEqual(report.versions, ("000001", "000002", "000003", "000004", "000005", "000006", "000007", "000008", "000009", "000010", "000011", "000012", "000013", "000014", "000015", "000016", "000017", "000018", "000019", "000020", "000021", "000022", "000023"))


    def test_rejects_missing_rollback_pair_and_manifest_entry(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "000001_test.up.sql").write_text("BEGIN;\nSELECT 1;\nCOMMIT;\n", encoding="utf-8")
            manifest = root / "manifest.json"
            manifest.write_text('{"schemaVersion":"1.0.0","migrations":[]}', encoding="utf-8")
            with self.assertRaises(MigrationViolation):
                validate_migrations(root, manifest)

    def test_rejects_destructive_up_or_unscoped_sensitive_table(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            up = "BEGIN;\nCREATE TABLE secret_record (record_id uuid);\nDROP TABLE old_data;\nCOMMIT;\n"
            down = "BEGIN;\nDROP TABLE secret_record;\nCOMMIT;\n"
            (root / "000001_test.up.sql").write_text(up, encoding="utf-8")
            (root / "000001_test.down.sql").write_text(down, encoding="utf-8")
            (root / "manifest.json").write_text(json.dumps({
                "schemaVersion": "1.0.0",
                "migrations": [{
                    "version": "000001", "issue": "TEST-1", "description": "test",
                    "impact": "data", "risk": "high", "owner": "DBA",
                    "requiredReviewers": ["DBA", "Security"], "rollback": "down migration",
                }],
            }), encoding="utf-8")
            with self.assertRaises(MigrationViolation):
                validate_migrations(root, root / "manifest.json")

    def test_runtime_role_has_no_ddl_or_bypass_grant(self) -> None:
        migration = (ROOT / "migrations/000002_v1_101_identity.up.sql").read_text(encoding="utf-8").lower()
        self.assertIn("nologin nobypassrls", migration)
        self.assertNotIn("grant create", migration)
        self.assertNotIn("grant all", migration)

    def test_runner_discovers_ordered_migrations_and_never_contains_credentials(self) -> None:
        runner = (ROOT / "scripts/run-migrations.sh").read_text(encoding="utf-8")
        self.assertIn('sort -r', runner)
        self.assertIn('ON_ERROR_STOP=1', runner)
        self.assertIn('schema_migrations', runner)
        self.assertIn("DOMUS_ALLOW_DESTRUCTIVE_ROLLBACK", runner)
        self.assertNotIn("PGPASSWORD=", runner)
        self.assertNotIn("postgresql://", runner)


if __name__ == "__main__":
    unittest.main()
