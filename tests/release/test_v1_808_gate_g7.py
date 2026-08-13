from __future__ import annotations

import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

from scripts.release_gate_g7 import (
    G7GateValidator,
    TraceabilityMatrix,
    compile_g7_dossier,
    generate_go_nogo_declaration,
)

NOW = datetime(2026, 8, 12, 12, tzinfo=UTC)


class GateG7Test(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp_dir.name)

    def tearDown(self) -> None:
        self.tmp_dir.cleanup()

    def test_traceability_matrix_covers_all_rfs(self) -> None:
        matrix = TraceabilityMatrix.load_default()
        coverage = matrix.verify_coverage()
        self.assertTrue(coverage["valid"])
        self.assertEqual(48, coverage["total_rfs"])
        self.assertEqual(0, len(coverage["unmapped_rfs"]))

    def test_p0_issues_evidence_verification(self) -> None:
        validator = G7GateValidator()
        result = validator.verify_p0_evidences()
        self.assertTrue(result["valid"])
        self.assertGreater(result["total_p0_issues"], 0)
        self.assertEqual(0, len(result["missing_evidences"]))

    def test_quality_and_evals_thresholds(self) -> None:
        validator = G7GateValidator()
        metrics = {
            "overall_groundedness": 0.95,
            "citation_validity": 0.98,
            "axe_violations": 0,
            "color_guard_passed": True,
            "dr_restore_tested": True,
            "action_gateway_idempotent": True,
            "unmitigated_findings": 0,
        }
        res = validator.evaluate_quality_gate(metrics)
        self.assertTrue(res["approved"])

        # Test threshold failure (Groundedness below 0.90)
        failing_metrics = dict(metrics, overall_groundedness=0.85)
        res_fail = validator.evaluate_quality_gate(failing_metrics)
        self.assertFalse(res_fail["approved"])
        self.assertIn("groundedness", res_fail["blockers"][0].lower())

        # Test Color Guard failure
        cg_fail_metrics = dict(metrics, color_guard_passed=False)
        res_cg_fail = validator.evaluate_quality_gate(cg_fail_metrics)
        self.assertFalse(res_cg_fail["approved"])
        self.assertIn("color guard", res_cg_fail["blockers"][0].lower())

    def test_dossier_compilation_and_go_nogo_declaration(self) -> None:
        dossier = compile_g7_dossier(now=NOW)
        self.assertEqual("Gate G7", dossier["gate"])
        self.assertEqual("APPROVED", dossier["status"])
        self.assertIn("traceability", dossier)
        self.assertIn("p0_evidence_audit", dossier)
        self.assertIn("quality_evals", dossier)

        declaration = generate_go_nogo_declaration(dossier)
        self.assertIn("DECLARAÇÃO GO / NO-GO — GATE G7", declaration)
        self.assertIn("**DECISÃO FINAL:** GO (AUTORIZADO PARA ONDA 8)", declaration)
        self.assertIn("QA Lead", declaration)
        self.assertIn("Product Owner", declaration)
        self.assertIn("Security Lead", declaration)


if __name__ == "__main__":
    unittest.main()
