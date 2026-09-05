# Cleanup — handoff

Branch `cleanup`. Written 5 Sept 2026, at the point the work moved from a
remote session into Claude Code in VS Code.

The plan this follows: **Admin Blueprint Remediation** —
https://claude.ai/code/artifact/c9ad9c53-d0d8-4eb8-8dfe-bf7f4c3aea29

That artifact has the full audit and the ten epics. This file is the delta:
what is actually done, what is proven versus assumed, and what to do next.

---

## The one thing to internalise

Two failure modes in this codebase are **silent**. Neither throws. Both have
already shipped to production, and both look exactly like "no data yet":

1. **RLS with no policy.** A browser-client read of an RLS-locked table
   returns an empty set, not an error. Three features shipped broken this way.
2. **A file the framework ignores.** `app/(dashboard)/layout.tsx` existed
   alongside `layout.js`; Next resolved the `.js` and ignored the `.tsx`. The
   entire Part AK security layer was written, reviewed, merged — and never
   ran.

So the working rule for this cleanup is: **prove it, don't read it.** Every
claim below says what proves it. Where nothing proves it, it says so.

---

## Done

### E1.1 — duplicate dashboard layout — **complete, verified on disk**

`layout.js` is deleted. `app/(dashboard)/layout.tsx` is now the only layout
and holds both trees:

```
PermissionsProvider          async server component; reads session from cookies
  └─ AiJobProviderClient
      └─ DashboardWrapper    auth gate + NewAdminDashboardShell
          └─ AdminSecurityLayer
              └─ {children}
```

**Proof that `layout.js` was the live one** (this is why it was merged rather
than deleted): the committed production build's
`.next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js`
listed `DashboardWrapper.tsx`, `stores/ai-job-context.tsx` and
`stores/permission-context.tsx`, and listed **no** `components/security/*`
module at all.

`AdminSecurityLayer` was placed *inside* `DashboardWrapper` deliberately:
`DashboardWrapper` returns `null` until the session resolves, so the watermark
and canary only mount once there is an identity to attribute them to.

⚠️ **The security layer is now executing for the first time ever.**
`ForensicWatermark`, `SecurityCanary`, `IdleSessionGuard` and
`BotSignalCollector` have never run in production. Expect tuning — a watermark
that covers the UI, or a 30-minute idle sign-out nobody was expecting. That is
not a regression from the merge; it is four features waking up. If they cause
trouble, gate them behind a flag rather than reverting the layout.

### E1.2 — Supabase clients — **five collapsed to three, no caller edited**

New canonical modules, all with file-level docs:

- `lib/db/browser.ts` → `getBrowserClient()`
- `lib/db/server.ts` → `getServerClient()`
- `lib/db/admin.ts` → `getAdminClient()` — service role, throws if evaluated
  in a browser bundle
- `lib/db/env.ts` — connection settings resolved once
- `lib/db/README.md` — the data-access rule

The five old modules are now deprecated re-exports. **No call site was
changed**, so this half cannot have broken anything.

Two real behaviour changes, both deliberate:

- `lib/supabase/indexAdmin.ts` no longer builds a service-role client at
  import time. It is a lazy `Proxy` — same shape, nothing constructed until
  first property access.
- `lib/db/admin.ts` throws if it reaches a browser bundle. A backstop, not
  permission.

**Still open:** `lib/supabase.ts` exports `supabase` (session in
localStorage) and `getSupabaseClient()` (session in cookies). Sign-in writes
to cookies, so anything using `supabase` is probably querying as `anon` —
and RLS then returns empty rather than erroring. Both preserved exactly;
migrating a caller is a behaviour change that may start returning rows.
Find them: `rg "from ['\"]@/lib/supabase['\"]"`.

**Now done:** `server-only` (zero deps) is installed and
`import "server-only";` is the first line of `lib/db/admin.ts`. The browser
guard is now a build error naming the offending file, not a runtime throw.
The `typeof window` throw was kept as a backstop for the paths the bundler
does not police (a runtime `require`, a DOM test environment).

**And it produced a real answer.** The build passes with the guard in place,
which proves something the audit could only assume: **no client component
reaches the service-role client.** 19 modules outside `app/api/**` import an
admin client — every one is a `"use server"` action, a server-only `lib/`
module, or a server component. `hooks/supabase-calls/useUser.ts` looks like
the exception and is not; nothing client-side imports it.

That is now enforced rather than believed. If someone later imports
`@/lib/db/admin` from a client component, `pnpm build` fails and names the
file.

### E0 — safety net — **built, not yet run**

| File | Guards |
| --- | --- |
| `tests/contract/mobile-contract.ts` | 16 routes + verbs + consumers, 28 RPCs, 34 tables |
| `tests/contract/api-routes.test.ts` | Route files exist and export their verbs |
| `tests/contract/rpc-signatures.json` | Real signatures, read from production |
| `tests/contract/rpc-signatures.test.ts` | Live DB vs snapshot; skips without creds |
| `tests/smoke/auth.setup.ts` | Signs in, saves session |
| `tests/smoke/admin-routes.spec.ts` | 34 nav routes + 11 orphan candidates |
| `playwright.config.ts` | Smoke config |
| `scripts/cleanup/regenerate-mobile-contract.sh` | Re-derives the contract |
| `docs/mobile-contract.md` | The contract, explained |

Migration `20260905_contract_rpc_signatures_reader.sql` (applied) adds a
read-only `pg_proc` reader, service-role only. It exists because the obvious
implementation — probe each RPC by calling it — would write rows to
production: `join_fitness_challenge`, `redeem_fitcoin_reward`,
`log_manual_activity` and the `increment_*` family are all volatile.
**Do not "simplify" that test into speculative calls.**

**Two findings from building it:**

1. The contract is **16 routes, not 13**. The original audit grepped only
   `hooks/` and `services/` and missed `/api/auth/device-context`,
   `/api/auth/device-sign-in/send-otp` and `/api/user/push-token` — called
   from `lib/` and `context/`. Two of those are the device sign-in flow.
2. **Two of the 16 contract routes are untyped `.js`** —
   `app/api/user/delete-account-request/route.js` and
   `app/api/search/dynamic/route.js`. The highest-risk files in the repo are
   the ones `tsc` never looks at.

**Not applied:** `.github/workflows/ci.yml`. The remote session could not
write to `.github/` (protected path). The updated version adds a **build**
job and passes `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SECRET_KEY` to the test
step. Apply it — the build job is the one that catches broken layouts and
server-only leaks.

### E6.1 — knip configured, and the first evidence-based deletions

`knip` is installed and configured (`knip.json`, with the reasoning in
`knip.README.md`). Run it with:

```bash
pnpm knip --include files,exports,dependencies
```

The config exists because the unconfigured run **lied twice**, and both lies
are the kind that get a working file deleted:

1. It reported `tests/smoke/auth.setup.ts` — the smoke suite's sign-in step —
   as dead. Knip's Playwright plugin reads `testDir` and the default
   `*.spec.ts` match; `auth.setup.ts` is reached only via the `setup`
   project's `testMatch` regex, which the plugin does not evaluate.
2. It reported `components/ui/button.tsx` as unused. **It has 143 importers.**
   The cause is worth remembering: `Button.jsx` and `button.tsx` sit in the
   same directory, so the extensionless specifier `@/components/ui/button` is
   ambiguous — the bundler resolves `.tsx` first and gets shadcn, while
   knip's resolver picks the other on a case-insensitive filesystem, and both
   halves then look unimported. Same for `card` and `select`.

That second one is not just a tool quirk — it is a live hazard for anyone
moving this tree to a case-sensitive filesystem. It is **not** suppressed in
the config; the fix is to delete the `.jsx` half, which is what happened.

Configured, the report is 80 unused files, 35 unused dependencies, 5 unused
devDependencies.

**Deleted this session — 22 files, each with two independent proofs**
(knip, plus a case-sensitive import search; route modules also checked
against the build manifest). Typecheck, `pnpm build` and the contract suite
are green after:

| Batch | Files | Second proof |
| --- | --- | --- |
| Duplicate route + shell | `new-fitness/`, `AdminDashboardShell.tsx`, `navIcons.ts`, `redesign/{Sidebar,Layout,KpiIcon,ThemeToggle}.tsx` | 0 importers; `new-fitness` had no `page.*` at all |
| Dead placeholder cluster | `PlaceholderPage.tsx`, `redesign/{Page,Tab}Placeholder.tsx`, 3 HCP tabs, 5 jobs tabs | whole cluster unreferenced |
| Legacy UI kit, dead half | `ui/{Breadcrumbs,Button,Card,Select}.jsx` | 0 importers, case-sensitive |

Two of these deserve a note:

- **`new-fitness` was never a route.** The directory held one file,
  `FitnessMenu.jsx`, and no `page.*`. It has never appeared in the build
  manifest. The audit listed it as a duplicate of `/fitness`; it was not even
  that.
- **`AdminDashboardShell.tsx` looked live to grep and was not.** A plain
  search for `AdminDashboardShell` returns three hits — all of them substring
  matches inside `NewAdminDashboardShell`, plus one comment. Only an
  import-specifier search settles it. This is exactly the trap rule 3 is
  about.

The 8 HCP/jobs tab components were a self-contained island: unreferenced
themselves, and the only importers of `TabPlaceholder` → `PagePlaceholder`.
`hcp/page.tsx` and `jobs/page.tsx` render their own inline tabs.

`components/redesign/PageHeader` (36 importers) and `KpiCard` (52) are very
much live — the `redesign/` directory is **not** uniformly dead, and it stays
ignored in `knip.json` because deciding its fate is E2 work, not a deletion.

### E2 — route evidence from the build manifest

The build manifest settles which orphan candidates are real routes, without
needing credentials. **All of them build except `new-fitness`:** `ai-hub`
(7 routes), `human-anatomy`, `medication-enquiry` (4), `view-reviews`,
`platform-schematic`, `security-center`, `categories` (9), `unauthorized`,
`onboarding-requests`, `referrals`, `view-facility-profile`,
`view-medication-reminder-details`, `view-notification`.

So each is reachable by URL today. Building is **not** evidence that a route
is used or that it renders anything useful — that is what the smoke sweep is
for. Do not delete any of them on this evidence alone.

---

## Next, in order

### 1. Run the net — **done, and it found two bugs in itself**

The whole net now runs. Contract suite 35 passed / 1 skipped, typecheck clean,
`pnpm build` clean, and **the route sweep has now run for the first time: 46
tests, all 34 nav routes green.**

Re-run it with:

```bash
export E2E_ADMIN_EMAIL='...' E2E_ADMIN_PASSWORD='...'
bash scripts/cleanup/02-run.sh
```

The orphan verdicts print as Playwright *annotations*, which the `list`
reporter does not show. To read them:

```bash
pnpm exec playwright test --reporter=json > /tmp/sweep.json
node -e "const r=require('/tmp/sweep.json');(function w(s){for(const x of s.suites||[])w(x);\
for(const sp of s.specs||[])for(const t of sp.tests||[])for(const res of t.results||[])\
for(const a of res.annotations||[])if(a.type==='orphan-check')console.log(a.description)})(r)"
```

⚠️ **The first version of this sweep classified every candidate as LIVE, and
every one of those verdicts was wrong.** Two defects, both now fixed in
`tests/smoke/admin-routes.spec.ts`. They are worth reading before trusting any
future addition to this file:

1. **This app has no 404.** `app/[...not-found]/page.jsx` is a root catch-all
   that calls `notFound()`, and it answers with **HTTP 200** and a rendered
   "Page not found" body. The test branched on `status >= 400`, which
   therefore never fired. `/new-fitness` — a directory with no `page.*` that
   has never appeared in a build manifest — was reported as *renders (LIVE)*.
   A nonsense path like `/zzz-not-a-route` returns a byte-identical body.
   Missing routes now have to be recognised by what they render.

2. **`domcontentloaded` samples the page before a redirect lands.** The
   redirect stubs in this tree resolve client-side. `/human-anatomy` was
   measured as an empty body still sitting at `/human-anatomy` — reading as
   "broken" when it is a working redirect to `/anatomy`. The sweep now waits
   for `networkidle`.

Both are the codebase's signature failure shape, now reproduced *in the test
written to catch it*: nothing throws, and the wrong answer looks like a real
one. A safety net that reports everything as fine is worse than no net.

### 1a. What the sweep actually found

Every candidate, settled. **Nothing here is a guess any more.**

| Route | Verdict |
| --- | --- |
| `/ai-hub`, `/ai-hub/{analytics,models,moderation,recommendations}` | redirect → `/ai` |
| `/medication-enquiry` + `/{delivery,escrow,pending}` | redirect → `/medenquiry` |
| `/human-anatomy` | redirect → `/anatomy` |
| `/platform-schematic` | redirect → `/schematic` |
| `/security-center` | redirect → `/security` |
| `/categories` (root) | **not a route** — catch-all |
| ~~`/new-fitness`~~ | **not a route** — catch-all. Deleted. |
| `/ai-hub/period`, `/ai-hub/period/content` | **renders — LIVE and unique** |
| `/onboarding-requests`, `/referrals`, `/unauthorized`, `/view-reviews` | renders — LIVE |
| `/view-facility-profile`, `/view-notification`, `/view-medication-reminder-details` | renders — LIVE |
| `/categories/{healthy_living,illness_and_complications,period_tracker}/overview` | renders — LIVE |

**The one that overturns the audit:** `/ai-hub` was flagged as *"8 files incl.
a 23 KB Workspace — substantial, check first"*. Five of its seven routes are
redirect stubs to `/ai`. But **`/ai-hub/period` and `/ai-hub/period/content`
render real, unique pages** and are in no sidebar. Deleting the `ai-hub`
directory wholesale — the obvious reading of "it's a duplicate of /ai" —
would have taken two live pages with it.

`/unauthorized` renders, as the audit predicted: it is a permission-failure
redirect target.

**Flakiness worth knowing about:** on one run `/medication-reminder` and
`/security` failed with *"rendered an empty body"*, then passed on the next
two runs. The nav block still uses `domcontentloaded`, so this is most likely
the same too-early-sampling problem as defect 2 above, on the two slowest
pages. If it recurs, move that block to `networkidle` as well rather than
adding a retry.

### E2 — redirect stubs converted to config rules — **done, sweep-verified**

Twelve `page.tsx` files whose only statement was `redirect(...)` are now rules
in `next.config.ts`, and the directories are gone:

| Was | Now redirects to |
| --- | --- |
| `/human-anatomy` | `/anatomy` |
| `/platform-schematic` | `/schematic` |
| `/security-center` | `/security` |
| `/medication-enquiry` + `/{delivery,escrow,pending}` | `/medenquiry` (+ `?tab=`) |
| `/ai-hub` + `/{analytics,models,moderation,recommendations}` | `/ai` (+ `?tab=`) |

Verified with an authenticated probe: all twelve land on the right path **with
the query string intact**, and the two survivors render byte-identical bodies
to before the change (3102 and 2347 chars). 59 smoke tests pass.

**`permanent: false` is deliberate.** It matches what the stubs already did —
`redirect()` defaults to 307 — so this change is behaviour-preserving. A 308
would be semantically truer, but browsers cache it indefinitely: if one of
these paths ever has to become a real page again, every admin who visited it
once keeps redirecting with no server-side way to stop them. For an
authenticated panel the extra round trip costs nothing.

**The sources are exact, not wildcards.** `/ai-hub/:path*` would be tidier and
would silently swallow `/ai-hub/period` and `/ai-hub/period/content`.

Two new blocking test groups guard this, in `tests/smoke/admin-routes.spec.ts`:

- **`live but unlinked — must not be deleted`** — asserts `/ai-hub/period` and
  `/ai-hub/period/content` still render. They are the two pages a future
  `rm -rf app/(dashboard)/ai-hub` would take out, and nothing links to them.
- **`retired routes still redirect`** — asserts all twelve mappings. A
  `next.config.ts` rule is easy to lose in a merge, and a dropped redirect
  breaks an admin's bookmark with no error anywhere.

Unlike the informational orphan block, both of these **fail the build**.

⚠️ **Operational trap, cost 20 minutes.** Do not `rm -rf .next` while a
`next start` from a previous build is still running. The old process keeps
serving, finds no chunk files, returns 500s with a `text/plain` MIME type, and
**15 nav routes fail with error boundaries and console errors** — which reads
exactly like a real regression. `/unauthorized` even rendered a plausible
157-char body instead of its usual 1754. Kill the server first:

```bash
pkill -f "next start"; lsof -ti:3000 | xargs kill -9
```

### 2. E2 — retire the duplicates

Reachability was checked against `app/(dashboard)/_components/admin-shell/navigation.ts`.

**In the sidebar (live):** `/ai` `/anatomy` `/fitness` `/medenquiry`
`/medication-reminder` `/reviews` `/schematic` `/security`

**Not in the sidebar — now settled by the sweep, not by guessing:**

| Route | Evidence | Action |
| --- | --- | --- |
| `human-anatomy` | redirect → `/anatomy` | keep as redirect, or delete *with* a `next.config` redirect rule |
| `medication-enquiry` (+3 children) | redirect → `/medenquiry` | same |
| `platform-schematic` | redirect → `/schematic` | same |
| `security-center` | redirect → `/security` | same |
| `ai-hub` (5 of 7 routes) | redirect → `/ai` | same — **but see below** |
| **`ai-hub/period`, `ai-hub/period/content`** | **renders, unique** | **do NOT delete.** Find its entry point or add it to the nav |
| `categories` (root) | not a route | nothing to delete; the children are live |
| `unauthorized` | renders | **keep** — permission-failure redirect target |
| `onboarding-requests`, `referrals`, `view-reviews` | renders | keep until an inbound-link search says otherwise |
| `view-facility-profile`, `view-notification`, `view-medication-reminder-details` | renders | keep — reached from table rows |

Every redirect stub above is a real decision, not a deletion: the admin
bookmarks and any push-notification deep links pointing at the old path have
to keep working. Deleting the directory is only safe **together with** an
equivalent rule in `next.config.ts`. That swap is a clean, self-contained PR
and is the obvious next piece of E2.

For the non-route modules (components, helpers), the tool of record is knip:

```bash
pnpm add -D knip && pnpm knip --include files,exports,dependencies
```

Also pending, same epic:

- ~~`components/redesign/Sidebar.tsx`~~ — **deleted**, 0 importers.
- ~~`AdminDashboardShell.tsx`~~ — **deleted**, 0 import specifiers. Only
  `NewAdminDashboardShell` is referenced, from `DashboardWrapper`.
- `lib/csv-export.ts` vs `lib/export-csv.ts` — same job, different signatures.
- `components/ui/*.jsx` (legacy kit) vs `components/ui/*.tsx` (shadcn). The
  four dead ones are gone. **Five are still live and have no `.tsx`
  counterpart** — `HtmlRenderer`, `Icon`, `Modal`, `Pagination`, `Textinput`.
  Porting those is the remaining E2.2 work.

Renames for consistency (`healthy_living` → `healthy-living`, `medenquiry` →
`medication-enquiry`) must ship **with redirects** — admins have these
bookmarked and `medenquiry` is in the nav.

### 3. E4 — god files

Splitting is additive, so it is low risk once the smoke sweep is green.

| File | Size |
| --- | --- |
| `app/(dashboard)/period/page.tsx` | 117 KB |
| `app/api/period/data/route.ts` | 76 KB |
| `app/(dashboard)/ai/page.tsx` | 44 KB |
| `stores/dialog-store.ts` | 30 KB |

Start with `period/page.tsx` — it is in the sidebar, so the sweep covers it.
Split by tab, not by line count.

### 4. E3 — feature modules

The big one, ~330 file moves. Do **E3.1 first**: move Anatomy alone to
`features/anatomy/{ui,api,data,schema,README.md}` with thin re-exports under
`app/`, review the shape as a team, and only then migrate the rest one feature
per PR. Leave `period` and `fitness` until the pattern is proven on three
smaller modules.

### 5. E5 — type safety

Convert `app/api/user/delete-account-request/route.js` and
`app/api/search/dynamic/route.js` first — they are mobile contract. Then the
other 77, then flip `allowJs: false`. Remove the `redesign/**` lint exclusion.

---

## Database changes made this session

All applied to project `rhbbxttxnvcziyqzptqs` and mirrored into
`supabase/migrations/`. Relevant because they changed the mobile contract:

- `body_parts` gained a `trg_body_parts_set_path` trigger deriving
  `path`/`level`. **This fixed the "+ Add Body Part" button, which had never
  worked** — `path` is `ltree NOT NULL` with no default and no trigger.
- Added a `Breasts` body part + its 3D hotspot pin.
- Backfilled `symptom_body_parts` (9→70 of 70), `healthy_living_body_parts`
  (0→73 of 77), `fitness_body_parts` (0→3,292), `drug_body_parts`
  (0→2,475 of 2,633). All tagged `source='heuristic'` so they can be reverted
  separately from hand-curated rows.
- `drug_body_part_rules` + `apply_drug_body_part_rules()` — a rules table so
  drug mappings can be extended without a migration.
- `get_anatomy_body_part_bundle` gained `p_preview_limit` (default 20):
  126 KB → 4.9 KB per call, counts stay exact.
- `get_anatomy_body_part_items` — new paged reader.
- `get_anatomy_region_content` gained `p_include_items` (default true):
  112 KB → 1.3 KB when false.
- Indexes on `fitness_body_parts(body_part_id)`,
  `healthy_living_body_parts(body_part_id)` — these were sequential scans.
- Fixed 3D seed: `Heart` and `Forearm and Wrist` were both pinned in the
  `head` region at head coordinates.

**Mobile side:** `hooks/use-anatomy.ts` now passes the new parameters and
adds `useAnatomyBodyPartItems` (per-tab paging, `kind` in the query key so
tabs don't share a cursor). `lib/query-persist.ts` is a new dependency-free
AsyncStorage cache for react-query.

---

## Things that are true and easy to forget

- `pnpm build` is not optional. `tsc` will not catch a broken route-group
  layout or a client component importing server-only code.
- `AGENTS.md` is regenerated by `next dev`. Do not put project rules there;
  they belong in `CLAUDE.md`.
- The repo root holds ~700 KB of gap-analysis and TASKS files. They are
  project *history*, not architecture. Do not treat them as current, and
  archive them when E7 comes round.
- `anatomy_hotspots` (2D) is empty and always has been. The admin Body Map
  falls back to region cards because of it. `anatomy_hotspots_3d` is the one
  in use.
