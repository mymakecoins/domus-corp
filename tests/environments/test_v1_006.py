"""Structural and negative acceptance checks for the Vercel-first V1-006."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = json.loads((ROOT / "deploy/vercel/projects.json").read_text(encoding="utf-8"))


class EnvironmentIsolationTest(unittest.TestCase):
    def test_each_environment_has_distinct_projects_per_runtime(self) -> None:
        expected = {"dev", "test", "staging", "prod"}
        self.assertEqual(expected, set(MODEL["environments"]))
        all_projects: list[str] = []
        for runtime in MODEL["runtimes"].values():
            self.assertEqual(expected, set(runtime["projects"]))
            all_projects.extend(runtime["projects"].values())
        self.assertEqual(len(all_projects), len(set(all_projects)))

    def test_test_uses_controlled_doubles(self) -> None:
        self.assertEqual("double", MODEL["environments"]["test"]["externalIntegrations"])
        for runtime in MODEL["runtimes"].values():
            self.assertIn("-test", runtime["projects"]["test"])
            self.assertNotEqual(runtime["projects"]["test"], runtime["projects"]["prod"])

    def test_python_never_receives_provider_credentials(self) -> None:
        knowledge = MODEL["runtimes"]["knowledge-api"]
        self.assertIn("PROVIDER_API_KEY", knowledge["forbiddenVariables"])
        self.assertNotIn("PROVIDER_API_KEY", knowledge["sensitiveVariables"])

    def test_identity_is_short_lived_and_project_scoped(self) -> None:
        identity = MODEL["workloadIdentity"]
        self.assertEqual("vercel-oidc", identity["mechanism"])
        self.assertFalse(identity["longLivedCloudCredentials"])
        self.assertIn("project", identity["trustClaims"])
        self.assertIn("environment", identity["trustClaims"])

    def test_kubernetes_is_not_an_approved_target(self) -> None:
        self.assertFalse((ROOT / "deploy/k8s").exists())
        self.assertFalse((ROOT / "charts").exists())
        self.assertFalse((ROOT / "helmfile.yaml").exists())


if __name__ == "__main__":
    unittest.main()
