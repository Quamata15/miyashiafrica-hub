#!/usr/bin/env bash
# Brings a Supabase project (the test project by default) up to date with supabase/migrations,
# through the Management API: migrations already recorded on the project are skipped, the
# others are applied in order and the script stops at the first error.
# Needs SUPABASE_ACCESS_TOKEN (personal access token). SUPABASE_PROJECT_REF defaults to staging.
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-brflszgaqoketsvyyluv}"
[[ "$REF" == "decycxufopbagjdpejul" && "${ALLOW_PRODUCTION:-}" != "1" ]] && { echo "Refus : c'est la production (ALLOW_PRODUCTION=1 pour forcer)"; exit 1; }
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
API="https://api.supabase.com/v1/projects/$REF/database/migrations"
done_list=$(curl -sS "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq -r '.[].name' 2>/dev/null || true)
applied=0
for f in supabase/migrations/*.sql; do
  b=$(basename "$f" .sql); n=${b#*_}
  grep -qxF "$n" <<<"$done_list" && continue   # recorded under the file name (versions are apply times)
  code=$(jq -n --rawfile q "$f" --arg n "$n" '{query:$q, name:$n}' | curl -sS -o /tmp/mig.out -w "%{http_code}" -X POST "$API" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data @-)
  if [[ "$code" != 2* ]]; then echo "FAIL $b ($code)"; head -c 2000 /tmp/mig.out; echo; exit 1; fi
  echo "ok   $b"; applied=$((applied + 1))
done
echo "$applied migration(s) appliquée(s) sur $REF"
