"""Validation rules for governed, reversible PostgreSQL migrations."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

NAME = re.compile(r"^(\d{6})_[a-z0-9_]+\.(up|down)\.sql$")
CREATE_TABLE = re.compile(
    r"create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_.]+)\s*\((.*?)\);",
    re.IGNORECASE | re.DOTALL,
)
DESTRUCTIVE_UP = re.compile(r"\bdrop\s+(?:table|schema|role|function)\b", re.IGNORECASE)
REQUIRED_METADATA = {
    "version", "issue", "description", "impact", "risk", "owner",
    "requiredReviewers", "rollback",
}


class MigrationViolation(ValueError):
    """Raised when a migration bypasses an approved repository invariant."""


@dataclass(frozen=True)
class MigrationReport:
    versions: tuple[str, ...]


def _load_manifest(path: Path) -> dict:
    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as error:
        raise MigrationViolation(f"invalid migration manifest: {error}") from error
    if manifest.get("schemaVersion") != "1.0.0" or not isinstance(manifest.get("migrations"), list):
        raise MigrationViolation("unsupported migration manifest")
    return manifest


def validate_migrations(directory: Path, manifest_path: Path) -> MigrationReport:
    pairs: dict[str, set[str]] = {}
    up_files: dict[str, Path] = {}
    for path in sorted(directory.glob("*.sql")):
        match = NAME.fullmatch(path.name)
        if match is None:
            raise MigrationViolation(f"invalid migration name: {path.name}")
        version, direction = match.groups()
        pairs.setdefault(version, set()).add(direction)
        sql = path.read_text(encoding="utf-8").strip()
        if not (sql.startswith("BEGIN;") and sql.endswith("COMMIT;")):
            raise MigrationViolation(f"migration must be transactional: {path.name}")
        if direction == "up":
            up_files[version] = path

    incomplete = {version: sides for version, sides in pairs.items() if sides != {"up", "down"}}
    if not pairs or incomplete:
        raise MigrationViolation(f"incomplete migration pairs: {incomplete}")

    versions = tuple(sorted(pairs))
    expected = tuple(f"{number:06d}" for number in range(1, len(versions) + 1))
    if versions != expected:
        raise MigrationViolation(f"migration versions must be contiguous: {versions}")

    manifest = _load_manifest(manifest_path)
    entries = manifest["migrations"]
    by_version = {entry.get("version"): entry for entry in entries if isinstance(entry, dict)}
    if set(by_version) != set(versions) or len(entries) != len(versions):
        raise MigrationViolation("manifest must cover every migration exactly once")

    for version in versions:
        entry = by_version[version]
        if not REQUIRED_METADATA.issubset(entry) or any(not entry[field] for field in REQUIRED_METADATA):
            raise MigrationViolation(f"incomplete governance metadata for {version}")
        reviewers = set(entry["requiredReviewers"])
        if "DBA" not in reviewers or "Security" not in reviewers:
            raise MigrationViolation(f"DBA and Security review are mandatory for {version}")
        up_sql = up_files[version].read_text(encoding="utf-8")
        if DESTRUCTIVE_UP.search(up_sql):
            raise MigrationViolation(f"destructive DDL is forbidden in up migration {version}")
        global_tables = set(entry.get("globalTables", [])) | {"schema_migrations"}
        for table, definition in CREATE_TABLE.findall(up_sql):
            if table not in global_tables and not re.search(r"\btenant_id\b", definition, re.IGNORECASE):
                raise MigrationViolation(f"sensitive table lacks tenant_id: {table}")

    return MigrationReport(versions=versions)
