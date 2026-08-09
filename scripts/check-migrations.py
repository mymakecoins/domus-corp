#!/usr/bin/env python3
"""CLI for governed, reversible SQL migration checks."""

from __future__ import annotations

from pathlib import Path

from migration_governance import validate_migrations

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "migrations"


def main() -> int:
    report = validate_migrations(MIGRATIONS, MIGRATIONS / "manifest.json")
    print(f"OK: {len(report.versions)} governed reversible migration pair(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
