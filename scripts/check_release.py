#!/usr/bin/env python3
"""Fail-closed release manifest and security finding gate."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$")
REQUIRED = {
    "issue",
    "version",
    "classification",
    "summary",
    "impact",
    "risks",
    "tests",
    "evidence",
    "rollback",
    "rings",
    "findings",
    "contractsVersion",
}
AUTHORIZED_ROLES = {"Security Lead", "Risk Owner"}


def _non_empty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate(manifest: dict[str, Any], now: datetime | None = None) -> list[str]:
    errors: list[str] = []
    missing = sorted(REQUIRED - manifest.keys())
    if missing:
        errors.append(f"missing release fields: {', '.join(missing)}")
        return errors
    if not SEMVER.fullmatch(str(manifest["version"])):
        errors.append("version must be semantic versioning")
    if manifest["classification"] not in {"low", "moderate", "high-p0"}:
        errors.append("invalid change classification")
    for field in ("summary", "impact"):
        if not _non_empty(manifest[field]):
            errors.append(f"{field} must be non-empty")
    if not manifest["risks"] or not all(_non_empty(item) for item in manifest["risks"]):
        errors.append("at least one concrete risk is required")
    if not manifest["tests"] or any(item.get("result") != "passed" for item in manifest["tests"]):
        errors.append("all declared release tests must pass")
    if not manifest["evidence"]:
        errors.append("release evidence is required")
    rollback = manifest["rollback"]
    if not _non_empty(rollback.get("runbook")) or not _non_empty(rollback.get("dataCompatibility")):
        errors.append("rollback runbook and data compatibility are required")
    if not manifest["rings"]:
        errors.append("at least one rollout ring is required")

    current = now or datetime.now(UTC)
    for finding in manifest["findings"]:
        if finding.get("severity") not in {"high", "critical"}:
            continue
        if finding.get("status") == "fixed":
            continue
        acceptance = finding.get("acceptance") if finding.get("status") == "accepted" else None
        if not isinstance(acceptance, dict):
            errors.append(f"{finding.get('id', 'unknown')}: high/critical finding blocks release")
            continue
        try:
            accepted = datetime.fromisoformat(acceptance["acceptedAt"].replace("Z", "+00:00"))
            expires = datetime.fromisoformat(acceptance["expiresAt"].replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            errors.append(f"{finding.get('id', 'unknown')}: invalid risk acceptance expiry")
            continue
        if acceptance.get("role") not in AUTHORIZED_ROLES or not _non_empty(
            acceptance.get("owner")
        ):
            errors.append(f"{finding.get('id', 'unknown')}: unauthorized risk acceptance")
        if (
            not _non_empty(acceptance.get("justification"))
            or accepted > current
            or expires <= current
        ):
            errors.append(f"{finding.get('id', 'unknown')}: expired or incomplete risk acceptance")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", nargs="?", default="release/candidate.json")
    args = parser.parse_args()
    path = ROOT / args.manifest
    manifest = json.loads(path.read_text(encoding="utf-8"))
    errors = validate(manifest)
    contract_version = (ROOT / "contracts/VERSION").read_text(encoding="utf-8").strip()
    if manifest.get("contractsVersion") != contract_version:
        errors.append("candidate contractsVersion does not match contracts/VERSION")
    if errors:
        for error in errors:
            print(f"BLOCKED: {error}", file=sys.stderr)
        return 1
    print(f"OK: release {manifest['version']} passed governance gate")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
