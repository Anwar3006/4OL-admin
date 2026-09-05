#!/usr/bin/env bash
#
# Regenerate the mobile contract from the Expo repo.
#
#   bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
#
# Prints what the mobile app currently depends on, so you can diff it against
# tests/contract/mobile-contract.ts. Run it before any release that moves an
# API route, renames an RPC, or changes an RLS policy.
#
# The manifest was hand-built once and was WRONG the first time: a pass over
# hooks/ and services/ alone found 13 routes and missed three called from
# lib/ and context/. Do not trust the checked-in list over this script.
#
set -euo pipefail

MOBILE="${1:-../4-Our-Life-App}"
if [ ! -d "$MOBILE" ]; then
  echo "Mobile repo not found at: $MOBILE" >&2
  echo "Usage: $0 <path-to-4-Our-Life-App>" >&2
  exit 1
fi

command -v rg >/dev/null 2>&1 || { echo "ripgrep (rg) required" >&2; exit 1; }

cd "$MOBILE"
SRC=(hooks services lib context app components store utils features)
EXISTING=()
for d in "${SRC[@]}"; do [ -d "$d" ] && EXISTING+=("$d"); done

echo "▸ scanning: ${EXISTING[*]}"
echo

echo "── Admin API routes ─────────────────────────────────────────────────"
rg -o --no-filename '/api/[A-Za-z0-9/_-]+' "${EXISTING[@]}" \
  | grep -Ev '/api/(distancematrix|directions)/' \
  | sort -u
echo

echo "── Postgres RPCs ────────────────────────────────────────────────────"
rg -o --no-filename "\.rpc\(\s*['\"][a-z0-9_]+" "${EXISTING[@]}" \
  | sed "s/.*['\"]//" | sort -u
echo

echo "── Tables read/written directly ─────────────────────────────────────"
rg -o --no-filename "\.from\(\s*['\"][a-z0-9_]+" "${EXISTING[@]}" \
  | sed "s/.*['\"]//" | sort -u
echo

cat <<'NOTE'
──────────────────────────────────────────────────────────────────────────
Diff this against tests/contract/mobile-contract.ts in the admin repo.
Anything NEW here is a dependency the contract tests are not yet guarding.
Anything MISSING here may be safe to retire — but check git history first;
a route can be called from a build that is still on people's phones.
NOTE
