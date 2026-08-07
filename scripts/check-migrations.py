#!/usr/bin/env python3
"""Dependency-free structural checks for reversible SQL migrations."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "migrations"
NAME = re.compile(r"^(\d{6})_[a-z0-9_]+\.(up|down)\.sql$")


def main() -> int:
    pairs: dict[str, set[str]] = {}
    for path in sorted(MIGRATIONS.glob("*.sql")):
        match = NAME.fullmatch(path.name)
        if match is None:
            raise ValueError(f"invalid migration name: {path.name}")
        version, direction = match.groups()
        pairs.setdefault(version, set()).add(direction)
        sql = path.read_text(encoding="utf-8").strip()
        if not (sql.startswith("BEGIN;") and sql.endswith("COMMIT;")):
            raise ValueError(f"migration must be transactional: {path.name}")
    incomplete = {version: sides for version, sides in pairs.items() if sides != {"up", "down"}}
    if not pairs or incomplete:
        raise ValueError(f"incomplete migration pairs: {incomplete}")
    print(f"OK: {len(pairs)} reversible migration pair(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
