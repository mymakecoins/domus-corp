from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class AIGovernanceTests(unittest.TestCase):
    def test_required_artifacts_are_versioned(self) -> None:
        required = [
            "docs/governance/ai-assisted-development-policy.md",
            "docs/governance/ai-responsibility-matrix.md",
            "docs/templates/ai-context-pack.md",
            "docs/templates/ai-review-checklist.md",
            "docs/templates/ai-provenance-record.md",
            ".ai/context-packs/V1-005.md",
            ".github/pull_request_template.md",
        ]
        self.assertEqual([], [path for path in required if not (ROOT / path).is_file()])

    def test_policy_contains_non_delegable_controls(self) -> None:
        policy = (ROOT / "docs/governance/ai-assisted-development-policy.md").read_text()
        for control in ("revisão humana", "segredo", "produção", "escrita externa", "autoaprovação", "fail-closed"):
            with self.subTest(control=control):
                self.assertIn(control, policy.lower())

    def test_provenance_template_covers_acceptance_record(self) -> None:
        record = (ROOT / "docs/templates/ai-provenance-record.md").read_text().lower()
        for field in ("responsável humano", "modelo", "context pack", "prompt", "saída", "arquivos alterados", "testes executados", "decisão humana"):
            with self.subTest(field=field):
                self.assertIn(field, record)


if __name__ == "__main__":
    unittest.main()
