#!/usr/bin/env bash
set -euo pipefail

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
direction=${1:-}

if [[ "$direction" != "up" && "$direction" != "down" ]]; then
  echo "usage: scripts/run-migrations.sh up|down" >&2
  exit 2
fi
if [[ "$direction" == "down" && "${DOMUS_ALLOW_DESTRUCTIVE_ROLLBACK:-}" != "local-or-ci" ]]; then
  echo "down migrations require DOMUS_ALLOW_DESTRUCTIVE_ROLLBACK=local-or-ci and explicit human control elsewhere" >&2
  exit 3
fi

python3 "$repository_root/scripts/check-migrations.py"

mapfile -t migration_files < <(find "$repository_root/migrations" -maxdepth 1 -type f -name "*.${direction}.sql" -print | sort)
if [[ "$direction" == "down" ]]; then
  mapfile -t migration_files < <(printf '%s\n' "${migration_files[@]}" | sort -r)
fi

for migration_file in "${migration_files[@]}"; do
  version_with_zeroes=$(basename "$migration_file" | cut -d_ -f1)
  version=$((10#$version_with_zeroes))
  if [[ "$direction" == "up" ]]; then
    exists=$(psql -X -v ON_ERROR_STOP=1 -Atqc "SELECT to_regclass('public.schema_migrations') IS NOT NULL")
    applied=f
    if [[ "$exists" == "t" ]]; then
      applied=$(psql -X -v ON_ERROR_STOP=1 -Atqc "SELECT EXISTS (SELECT FROM schema_migrations WHERE version = $version)")
    fi
    [[ "$applied" == "t" ]] && continue
  else
    exists=$(psql -X -v ON_ERROR_STOP=1 -Atqc "SELECT to_regclass('public.schema_migrations') IS NOT NULL")
    [[ "$exists" != "t" ]] && continue
    applied=$(psql -X -v ON_ERROR_STOP=1 -Atqc "SELECT EXISTS (SELECT FROM schema_migrations WHERE version = $version)")
    [[ "$applied" != "t" ]] && continue
  fi
  psql -X -v ON_ERROR_STOP=1 -f "$migration_file"
done
