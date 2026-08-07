#!/usr/bin/env sh
set -eu

direction=${1:-up}
case "$direction" in
  up|down) ;;
  *) echo "usage: $0 [up|down]" >&2; exit 2 ;;
esac

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ "$direction" = "up" ]; then
  files=$(find "$repository_root/migrations" -name '*.up.sql' -type f | sort)
else
  files=$(find "$repository_root/migrations" -name '*.down.sql' -type f | sort -r)
fi

for file in $files; do
  echo "Applying $(basename "$file")"
  docker compose --project-directory "$repository_root" exec -T postgres \
    psql --set ON_ERROR_STOP=1 --username "${POSTGRES_USER:-domus}" \
    --dbname "${POSTGRES_DB:-domus}" < "$file"
done
