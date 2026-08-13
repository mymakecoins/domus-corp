from __future__ import annotations

import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
UP=(ROOT/"migrations/000006_v1_303_catalog.up.sql").read_text(encoding="utf-8").lower()
DOWN=(ROOT/"migrations/000006_v1_303_catalog.down.sql").read_text(encoding="utf-8").lower()
class CatalogMigrationTest(unittest.TestCase):
    def test_versions_provider_model_price_and_fallback(self):
        for table in ("model_provider_catalog","model_catalog","model_fallback","model_catalog_audit"): self.assertIn(f"create table {table}",UP)
        self.assertIn("input_minor_per_million_tokens",UP);self.assertIn("price_version",UP)
    def test_separates_runtime_and_admin_with_rls(self):
        self.assertIn("domus_catalog_admin",UP);self.assertIn("domus_gateway_runtime",UP);self.assertIn("force row level security",UP)
    def test_is_reversible(self):
        for table in ("model_catalog_audit","model_fallback","model_catalog","model_provider_catalog"): self.assertIn(f"drop table {table}",DOWN)
if __name__=="__main__":unittest.main()
