#!/usr/bin/env sh
set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repository_root"

command -v node >/dev/null 2>&1 || { echo "Node.js 22 is required" >&2; exit 1; }
node_major=$(node -p "process.versions.node.split('.')[0]")
[ "$node_major" = "22" ] || { echo "Node.js 22 is required; found $(node --version)" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required (enable Corepack)" >&2; exit 1; }
command -v uv >/dev/null 2>&1 || { echo "uv is required" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker with Compose is required" >&2; exit 1; }

pnpm install --frozen-lockfile
UV_CACHE_DIR="$repository_root/.local/uv-cache" uv sync --frozen
docker compose config --quiet

echo "Bootstrap complete. Run 'make up' to start local dependencies."
