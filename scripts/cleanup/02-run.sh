#!/usr/bin/env bash
#
# Cleanup phase 2 — install the safety net (Epic E0) and run it.
#
#   bash scripts/cleanup/02-run.sh
#
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "▸ branch: $(git branch --show-current)"

# ── Playwright ─────────────────────────────────────────────────────────────
if ! node -e "require.resolve('@playwright/test')" >/dev/null 2>&1; then
  echo "▸ installing @playwright/test"
  pnpm add -D @playwright/test
  pnpm exec playwright install chromium --with-deps
else
  echo "▸ @playwright/test already installed"
fi

# ── Contract tests (no server needed) ──────────────────────────────────────
echo
echo "▸ mobile contract tests"
pnpm test:contract

# ── Smoke sweep ────────────────────────────────────────────────────────────
echo
if [ -z "${E2E_ADMIN_EMAIL:-}" ] || [ -z "${E2E_ADMIN_PASSWORD:-}" ]; then
  cat <<'SKIP'
▸ skipping the route sweep — no admin credentials.

  To run it:
      export E2E_ADMIN_EMAIL='you@example.com'
      export E2E_ADMIN_PASSWORD='...'
      pnpm build && pnpm test:smoke

  Or point it at a deployed preview instead of building locally:
      export E2E_BASE_URL='https://your-preview.vercel.app'
      pnpm test:smoke
SKIP
else
  echo "▸ building"
  pnpm build
  echo "▸ route sweep across 34 nav routes + 11 orphan candidates"
  pnpm test:smoke
fi

cat <<'DONE'

────────────────────────────────────────────────────────────────────────────
The sweep's second block, "orphan route candidates", is the evidence for the
next epic. Each test prints one of:

  → renders          LIVE. Do not delete without finding who links to it.
  → redirects to X   Keep as a redirect, or delete with a redirect rule.
  → 404/500          Already broken. Safe to delete.

Paste that block back and we will retire the duplicates from real evidence
rather than from the sidebar being silent about them.
────────────────────────────────────────────────────────────────────────────
DONE
