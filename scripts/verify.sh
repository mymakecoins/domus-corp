#!/usr/bin/env sh
set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repository_root"
export UV_CACHE_DIR="$repository_root/.local/uv-cache"

python3 -m unittest tests.scaffold.test_repository -v
python3 -m unittest tests.governance.test_ai_governance -v
python3 -m unittest tests.environments.test_v1_006 -v
python3 -m unittest tests.release.test_release_gate -v
python3 -m unittest tests.migrations.test_v1_101_identity -v
python3 -m unittest tests.migrations.test_v1_701_governance -v
python3 -m unittest tests.migrations.test_v1_102_tenancy -v
python3 -m unittest tests.migrations.test_v1_103_policy -v
python3 -m unittest tests.migrations.test_v1_302_credentials -v
python3 -m unittest tests.security.test_v1_302_secret_boundaries -v
python3 scripts/check_release.py
python3 tests/contracts/validate_contracts.py
python3 scripts/check-migrations.py
pnpm check
uv run ruff check apps/knowledge-api
uv run ruff format --check apps/knowledge-api
uv run mypy
uv run pytest
docker compose config --quiet
