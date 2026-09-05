# Cleanup — status

Branch: `cleanup`. Updated 5 Sept 2026.

Each item says what changed, what proves it, and what is still unverified.
Nothing here was deleted or rewritten on the strength of a guess.

---

## 1 · Duplicate dashboard layout — **merged, pending your build**

`app/(dashboard)/` contained both `layout.js` and `layout.tsx`. Next.js
resolves one and ignores the other, and `next.config.ts` sets no
`pageExtensions`, so which one won was a framework default.

**`layout.js` won.** Evidence, from the committed production build:

```
.next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js
  ✓ app/(dashboard)/_components/DashboardWrapper.tsx
  ✓ stores/ai-job-context.tsx
  ✓ stores/permission-context.tsx
  ✗ components/security/*          ← nothing from this directory
```

### The finding this turned up

The Part AK security layer — `ForensicWatermark`, `SecurityCanary`,
`IdleSessionGuard`, `BotSignalCollector` — **has never run in production.**
It was written, reviewed, merged and shipped into the file the framework was
ignoring. Four security features and their four backing tables have been
dormant since Part AK landed.

That reverses the risk I first described. The danger was never "someone
deletes the stray JS file". It is that `layout.tsx` reads like the live
layout, so anyone auditing security would conclude the layer is on.

### What changed

`layout.tsx` now holds both trees and is the only layout. Order:

```
PermissionsProvider          server component; reads session from cookies
  └─ AiJobProviderClient
      └─ DashboardWrapper    auth gate + NewAdminDashboardShell
          └─ AdminSecurityLayer
              └─ {children}
```

`AdminSecurityLayer` sits **inside** `DashboardWrapper`, not outside it.
`DashboardWrapper` returns `null` until the session is confirmed, so the
watermark and canary only mount once there is an identity to attribute them
to. A watermark over a pre-auth blank screen identifies nobody.

### Still to do

Run `bash scripts/cleanup/01-run.sh`. It creates the branch, deletes
`layout.js`, and runs typecheck + build. Then check by hand that sign-in,
sign-out and the newly-live security layer all behave — the script prints
the list. **Expect the security layer to need tuning**: it is four pieces of
UI-affecting code being exercised for the first time.

---

## 2 · Supabase clients — **five collapsed to three, callers untouched**

There were five modules, two of them service-role, with four different env
fallback chains between them.

### New canonical modules

| Module | Export | Runs as | RLS |
| --- | --- | --- | --- |
| `lib/db/browser.ts` | `getBrowserClient()` | signed-in admin | enforced |
| `lib/db/server.ts` | `getServerClient()` | signed-in admin | enforced |
| `lib/db/admin.ts` | `getAdminClient()` | service role | **bypassed** |

`lib/db/env.ts` resolves connection settings once. `lib/db/README.md` is the
data-access rule — which client to use where, and why the RLS trap costs
features rather than throwing errors.

### Two real changes

- **`lib/supabase/indexAdmin.ts` no longer builds a service-role client on
  import.** It used to construct one at module scope, so importing the file
  from anywhere — including by accident from a client component — created a
  client holding the service key. It is now a lazy Proxy: same shape for
  callers, but nothing is constructed until first use.
- **`lib/db/admin.ts` throws if evaluated in a browser bundle.** A backstop,
  not permission. The stronger fix is the zero-dependency `server-only`
  package and `import "server-only";` as line 1, which turns a client import
  into a *build* error naming the file. Left out to avoid adding a dependency
  mid-cleanup — worth adding.

### Nothing else changed behaviour

The five old modules are now deprecated re-exports. No call site was edited,
so this half of the work cannot have broken anything. Mobile is untouched:
the Expo app has its own Supabase client and never imports from this repo.

### ⚠️ The thing to look at next

`lib/supabase.ts` exports **two clients that do not share a session**:

- `supabase` — plain `supabase-js`, session in **localStorage**
- `getSupabaseClient()` — `@supabase/ssr`, session in **cookies**

Sign-in writes the session to cookies. So anything using `supabase` is
probably querying as `anon`, not as the signed-in admin — and any table
requiring `authenticated` returns **empty rather than erroring**. That is the
same silent-empty failure that hid three broken features this month
(`healthy_living_body_parts`, `fitness_body_parts`, `drug_body_parts`).

Both exports are preserved exactly as they were, because migrating a caller
from `supabase` to `getBrowserClient()` is a behaviour change — it may start
returning rows where it previously returned none. Usually that is the fix,
but each call site needs looking at. To find them:

```bash
rg -l "from ['\"]@/lib/supabase['\"]" --type ts --type tsx
```

---

## 3 · Parallel modules — **classified, not yet deleted**

Reachability was checked against the real nav,
`app/(dashboard)/_components/admin-shell/navigation.ts`.

### Live (in the sidebar)

`/ai` · `/anatomy` · `/fitness` · `/medenquiry` · `/medication-reminder` ·
`/reviews` · `/schematic` · `/security`

### Not in the sidebar — candidates, **not confirmed dead**

| Route | Note |
| --- | --- |
| `human-anatomy` | 124-byte redirect stub → `/anatomy`. Harmless; may back a bookmark. |
| `new-fitness` | Single `FitnessMenu.jsx`. Superseded by `/fitness`. |
| `ai-hub` | 8 files incl. a 23 KB Workspace. **Substantial — check before touching.** |
| `medication-enquiry` | Third spelling alongside `medenquiry`. |
| `view-reviews` | Superseded by `/reviews`. |
| `platform-schematic` | Superseded by `/schematic`. |
| `security-center` | Superseded by `/security`. |
| `categories`, `unauthorized`, `onboarding-requests`, `referrals`, `view-facility-profile`, `view-medication-reminder-details`, `view-notification` | **Probably live via deep links,** not the sidebar. `unauthorized` is a redirect target for permission failures. |

Absence from the sidebar is weak evidence. Nothing above is safe to delete on
that alone, and several are near-certainly reachable. Settle it mechanically:

```bash
pnpm add -D knip
pnpm knip --include files,exports,dependencies
```

Then delete in themed batches with a build between each.

### Also pending

- `components/redesign/Sidebar.tsx` (10 KB) contains one link, `/login`. The
  real nav is `admin-shell/navigation.ts`. Strong dead-code candidate.
- `AdminDashboardShell.tsx` vs `NewAdminDashboardShell.tsx` — only the New one
  is referenced, from `DashboardWrapper`.
- `lib/csv-export.ts` and `lib/export-csv.ts` — same job, different
  signatures. Pick one.

Renaming for consistency (`healthy_living` → `healthy-living`,
`medenquiry` → `medication-enquiry`) is worth doing but must ship **with
redirects** — admins have these bookmarked, and `medenquiry` is in the nav.

---

## 4 · Type safety — **not started**

`tsconfig.json` sets `strict: true` above `allowJs: true` / `checkJs: false`,
and its `include` lists only `.ts` and `.tsx`. The 79 `.js`/`.jsx` files under
`app/` are never type-checked — including `app/services/dashboard.js` (31 KB).
`eslint.config.mjs` additionally excludes `redesign/**` entirely.

Converting those files blind, with no way to run `tsc` between edits, is how a
cleanup becomes an outage. This one needs the build loop working first.

---

## E0 · Safety net — **built, needs one run from you**

Note on numbering: your list last turn was the four *faults*, not the epics.
The mapping is — fault 1 → story E1.1, fault 2 → E1.2, fault 3 → **epic E2**,
fault 4 → **epic E5**. So E1 is done; E2 (retire duplicates) is classified but
not executed, and E5 (types) has not started.

### What was added

| File | Purpose |
| --- | --- |
| `tests/contract/mobile-contract.ts` | The frozen surface: 16 routes, 28 RPCs, 34 tables |
| `tests/contract/api-routes.test.ts` | Route files exist and export their verbs |
| `tests/contract/rpc-signatures.json` | Real signatures, read from production |
| `tests/contract/rpc-signatures.test.ts` | Live DB vs snapshot |
| `tests/smoke/auth.setup.ts` | Signs in once, saves the session |
| `tests/smoke/admin-routes.spec.ts` | Sweeps 34 nav routes + 11 orphan candidates |
| `playwright.config.ts` | Smoke config, skips without credentials |
| `scripts/cleanup/regenerate-mobile-contract.sh` | Re-derives the contract from the Expo repo |
| `docs/mobile-contract.md` | The contract, written down |
| `.github/workflows/ci.yml` | Added a **build** job; contract tests get DB secrets |

Migration `20260905_contract_rpc_signatures_reader.sql` adds one read-only
`pg_proc` reader, service-role only. It exists because the obvious
implementation — probe each RPC by calling it — would have written rows to
production: `join_fitness_challenge`, `redeem_fitcoin_reward`,
`log_manual_activity` and the `increment_*` family are all volatile.

### The contract was wrong

It is **16 routes, not 13.** The audit grepped only `hooks/` and `services/`
and missed three called from `lib/` and `context/`:

- `/api/auth/device-context`
- `/api/auth/device-sign-in/send-otp`
- `/api/user/push-token`

Any of those three could have been renamed during E3 and shipped a broken
sign-in flow to every installed build. Hence
`regenerate-mobile-contract.sh` — the manifest is a cache, the script is the
source of truth.

Also found: **two of the 16 contract routes are untyped `.js`** —
`user/delete-account-request` and `search/dynamic`. The highest-risk files in
the repo are the ones `tsc` never looks at. Convert those two first in E5.

### Run it

```bash
bash scripts/cleanup/02-run.sh
```

The sweep's "orphan route candidates" block is the evidence E2 needs — it
reports, per route, whether it renders, redirects, or is already broken.

---

## E3 · Feature modules — **blocked on tooling, not on decisions**

E3 is ~330 file moves. I have no shell on your machine, so I cannot `git mv`,
cannot `rg` for import sites, and cannot run `tsc` between steps. Doing it
through single-file writes would mean hundreds of blind edits with no
verification loop — precisely the failure this plan exists to avoid.

Two ways forward, in order of preference:

1. **Get the local workspace running again** (it has failed to start all
   session). Then E3 is a normal refactor with a verify loop.
2. **Run the sweep above, paste the orphan block**, and we do E2 first — it
   removes ~11 route modules and one of the two UI kits, which shrinks E3's
   surface before it starts.

E3.1 — proving the pattern on Anatomy alone — is worth doing either way, and
is small enough to do through file writes. Say the word.

---

## E4 · God files — **ready to start, tractable without a shell**

Splitting a file is additive: write the new modules, rewrite the original as a
composition. No deletes, no moves. The four targets:

| File | Size |
| --- | --- |
| `app/(dashboard)/period/page.tsx` | 117 KB |
| `app/api/period/data/route.ts` | 76 KB |
| `app/(dashboard)/ai/page.tsx` | 44 KB |
| `stores/dialog-store.ts` | 30 KB |

`period/page.tsx` is the obvious first cut — 117 KB in one file, and the
route is in the sidebar so the smoke sweep already covers it. It needs the
safety net running first, which is why E0 came before it.
