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

# Use ripgrep when a REAL binary is present, else fall back to grep.
#
# `command -v rg` is not a sufficient test here: some shells (Claude Code's
# among them) define `rg` as a shell FUNCTION, which passes that check and
# then does not exist inside this script's plain-bash subshell. This script
# used to exit 1 with "ripgrep required" on a machine where `rg` worked fine
# at the prompt — so the one tool that guards the mobile contract could not
# be run at all. Test for an executable file, not a name.
if [ -x "$(command -v rg 2>/dev/null)" ]; then
  SCAN() { rg -o --no-filename "$@"; }
else
  # grep -o with -E covers the same ground for these three patterns.
  SCAN() {
    local pattern="$1"; shift
    grep -rhoE "$pattern" "$@" \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
      2>/dev/null
  }
fi

cd "$MOBILE"
SRC=(hooks services lib context app components store utils features)
EXISTING=()
for d in "${SRC[@]}"; do [ -d "$d" ] && EXISTING+=("$d"); done

echo "▸ scanning: ${EXISTING[*]}"
echo

echo "── Admin API routes ─────────────────────────────────────────────────"
SCAN '/api/[A-Za-z0-9/_-]+' "${EXISTING[@]}" \
  | grep -Ev '/api/(distancematrix|directions)/' \
  | sort -u
echo

echo "── Postgres RPCs ────────────────────────────────────────────────────"
SCAN "\.rpc\(['\"][a-z0-9_]+" "${EXISTING[@]}" \
  | sed "s/.*['\"]//" | sort -u
echo

echo "── Tables read/written directly ─────────────────────────────────────"
SCAN "\.from\(['\"][a-z0-9_]+" "${EXISTING[@]}" \
  | sed "s/.*['\"]//" | sort -u
echo

cat <<'NOTE'
──────────────────────────────────────────────────────────────────────────
Diff this against tests/contract/mobile-contract.ts in the admin repo.
Anything NEW here is a dependency the contract tests are not yet guarding.
Anything MISSING here may be safe to retire — but check git history first;
a route can be called from a build that is still on people's phones.
NOTE
