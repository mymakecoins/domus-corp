"""Structural acceptance tests for the V1-004 repository foundation."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class RepositoryFoundationTest(unittest.TestCase):
    def test_required_foundation_files_exist(self) -> None:
        required = (
            "package.json",
            "pnpm-workspace.yaml",
            "turbo.json",
            "pyproject.toml",
            "uv.lock",
            "compose.yaml",
            "Makefile",
            ".github/workflows/ci.yml",
            ".github/workflows/staging-images.yml",
            "apps/control-plane/Dockerfile",
            "apps/knowledge-api/Dockerfile",
            "migrations/000001_v1_004_baseline.up.sql",
            "migrations/000001_v1_004_baseline.down.sql",
        )
        missing = [name for name in required if not (ROOT / name).is_file()]
        self.assertEqual([], missing, f"missing foundation files: {missing}")

    def test_typescript_runtime_is_private_and_pinned(self) -> None:
        manifest = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertTrue(manifest["private"])
        self.assertRegex(manifest["packageManager"], r"^pnpm@\d+\.\d+\.\d+$")
        self.assertEqual(">=22 <23", manifest["engines"]["node"])

    def test_compose_has_required_local_dependencies(self) -> None:
        compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        for service in ("postgres:", "redis:", "minio:", "qdrant:"):
            self.assertIn(service, compose)
        self.assertNotIn("latest", compose)

    def test_containers_use_non_root_runtime_users(self) -> None:
        for dockerfile in (
            ROOT / "apps/control-plane/Dockerfile",
            ROOT / "apps/knowledge-api/Dockerfile",
        ):
            content = dockerfile.read_text(encoding="utf-8")
            self.assertIn("USER ", content)
            self.assertNotIn("USER root", content)


if __name__ == "__main__":
    unittest.main()
