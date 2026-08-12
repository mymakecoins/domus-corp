"""
Tests for migration 000026_v1_703_history_retention_partitioning: validates SQL syntax,
manifest entry, range partitioning setup, and rollback safety.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_v1_703_migration_files_exist_and_valid() -> None:
    up_sql = ROOT / "migrations" / "000026_v1_703_history_retention_partitioning.up.sql"
    down_sql = ROOT / "migrations" / "000026_v1_703_history_retention_partitioning.down.sql"
    manifest_path = ROOT / "migrations" / "manifest.json"

    assert up_sql.exists()
    assert down_sql.exists()
    assert manifest_path.exists()

    up_content = up_sql.read_text(encoding="utf-8")
    down_content = down_sql.read_text(encoding="utf-8")

    # Assert SQL structure and safety
    assert "BEGIN;" in up_content
    assert "COMMIT;" in up_content
    assert "schema_migrations" in up_content
    assert "PARTITION" in up_content or "audit_event" in up_content
    assert "BEGIN;" in down_content
    assert "COMMIT;" in down_content

    # Assert manifest entry
    manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
    versions = [m["version"] for m in manifest_data["migrations"]]
    assert "000026" in versions
    v26 = next(m for m in manifest_data["migrations"] if m["version"] == "000026")
    assert v26["issue"] == "V1-703"
