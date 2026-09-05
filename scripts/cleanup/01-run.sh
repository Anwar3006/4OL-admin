#!/usr/bin/env bash
#
# Cleanup phase 1 — branch, delete the dead layout, verify.
#
# Run from the repo root:   bash scripts/cleanup/01-run.sh
#
# Everything here needs a shell, which is why it is a script rather than an
# edit. The file changes it depends on are already in your working tree.
#
set -euo pipefail

cd "$(dirname "$0")/../.."
echo "▸ repo: $(pwd)"

# ── 1. Branch ──────────────────────────────────────────────────────────────
# Uncommitted changes follow you onto a new branch, so it is safe to do this
# after the edits rather than before.
if git rev-parse --verify cleanup >/dev/null 2>&1; then
  echo "▸ branch 'cleanup' already exists — switching to it"
  git checkout cleanup
else
  echo "▸ creating branch 'cleanup'"
  git checkout -b cleanup
fi

# ── 2. Delete the dead layout ──────────────────────────────────────────────
# app/(dashboard)/ contained both layout.js and layout.tsx. Next.js resolved
# layout.js and ignored layout.tsx — verified against the committed build:
#
#   .next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js
#
# lists DashboardWrapper.tsx, stores/ai-job-context.tsx and
# stores/permission-context.tsx, and lists NO components/security/* module.
#
# layout.tsx has been rewritten to contain both trees. Removing layout.js is
# what makes it take effect.
if [ -f "app/(dashboard)/layout.js" ]; then
  echo "▸ removing app/(dashboard)/layout.js (merged into layout.tsx)"
  git rm --quiet "app/(dashboard)/layout.js"
else
  echo "▸ app/(dashboard)/layout.js already gone"
fi

# ── 3. Verify ──────────────────────────────────────────────────────────────
echo
echo "▸ typecheck"
pnpm type-check

echo
echo "▸ production build"
pnpm build

cat <<'DONE'

────────────────────────────────────────────────────────────────────────────
Build passed. Two things to check by hand before committing, because no
automated test in this repo covers them yet:

  1. Sign in. You should land on the dashboard with the sidebar and shell.
     Then sign out — you should be redirected to /login.
     (This exercises DashboardWrapper, which until now was mounted by the
     file we just deleted.)

  2. Open DevTools on any admin page and confirm the security layer is now
     running: you should see a forensic watermark element in the DOM, and
     network calls from BotSignalCollector. NONE of this was happening
     before — that code has never run in production.

If step 2 misbehaves (watermark covering the UI, idle guard signing you out
too eagerly), the layer is genuinely untested in production. Say so and we
will gate it behind a flag rather than reverting the layout merge.
────────────────────────────────────────────────────────────────────────────
DONE
