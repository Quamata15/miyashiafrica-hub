#!/usr/bin/env bash
# Runs supabase/tests/*.sql against a project through the Supabase Management API.
# Each test runs in one transaction that always ends with RAISE EXCEPTION 'RESULT:…',
# so nothing is ever written. Needs SUPABASE_ACCESS_TOKEN (personal access token) and
# SUPABASE_PROJECT_REF (defaults to production; point it at a test project when you have one).
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-decycxufopbagjdpejul}"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
fail=0
for f in supabase/tests/*.sql; do
  out=$(jq -n --rawfile q "$f" '{query:$q}' | curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data @-)
  result=$(printf '%s' "$out" | grep -o 'RESULT:[^\\]*' || true)
  if [[ -z "$result" ]]; then echo "FAIL $f: $out"; fail=1; continue; fi
  # Any "=NO" marker or a refused check that should pass means a broken rule.
  if grep -qE '=NO\b|immutable=NO|blocked_active=true|ledger_balanced=false|search_accent=0' <<<"$result"; then echo "FAIL $f: $result"; fail=1
  else echo "ok   $f"; fi
done
exit $fail
