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

### E2.3 — one CSV helper — **done**

The audit named two CSV exporters, `lib/csv-export.ts` and `lib/export-csv.ts`.
There were **ten**. The other eight were inlined into components, which is why
a grep for the two module names missed them; the search that finds them is for
the mechanism, not the name:

```bash
grep -rn "new Blob(\[.*csv\|text/csv" app components lib | grep -v ^app/api/
```

All ten now call `downloadCsv` from `lib/csv.ts`. Both old modules are gone and
the name no longer invites the `csv-export` / `export-csv` coin-flip.

**Three behaviour differences had to be resolved, and two were live bugs:**

1. **The byte-order mark.** Only `exportCsv` (3 of 15 call sites) wrote one.
   Excel assumes the host's legacy codepage for a BOM-less file, so any
   non-ASCII name exported from the other twelve arrived mojibaked. Now always
   written. This is a fix, not a preference.
2. **The anchor was never in the document.** Four inlined copies created an
   `<a>`, set `download` and called `.click()` without appending it. Chrome
   tolerates it; Firefox ignores the click and the export silently does
   nothing. The shared helper appends first.
3. **The filename.** One stamped the date, the other did not. Stamping won.

The signature is objects-only — `downloadCsv(rows, "stem")` — with no
`headers` parameter. The array-of-arrays form that four copies used kept
labels and values in two lists that had to stay in the same order;
`SubscriptionsTab` had them **eleven lines apart**, which is one careless
insertion away from silently mislabelling a column. Object keys carry the
label, so they cannot drift.

`toCsv` is split out as a pure function and covered by 12 unit tests in
`tests/unit/csv.test.ts` — the first unit tests in the repo that assert
behaviour rather than file existence.

**Not covered:** the eleven server-side exporters under `app/api/**/export/`.
They stream CSV in a Response, share none of the DOM code, and repeat the
escaping among themselves. That is a separate unification.

### E2.3 — one date library, one currency formatter — **done**

E2.3 asked for one CSV helper, one date formatter and one currency formatter.
CSV was done earlier on this branch; this is the other two.

#### moment is gone — one date library

`moment` was imported by exactly three files, and all three were dead or
nearly so: `app/services/dashboard.js` and `app/services/banners_ads.js` (zero
importers, knip-unused), and `app/utils/helpers.js`, whose only live export
was a moment-based `formatDate`.

`formatDate` now lives in `lib/format.ts`, built on `Intl` rather than
date-fns so it pulls in no library at all — `en-CA` is the locale whose short
date format *is* ISO, which avoids hand-assembling the string and getting the
timezone wrong.

**`moment` and `crypto-js` are removed from `package.json`** (crypto-js was
used only by the deleted `helpers.js`). 121 runtime dependencies → 119, and
date-fns is now the only date library.

⚠️ `formatDate` renders in the **viewer's timezone**, matching what
`moment(x).format("YYYY-MM-DD")` did. For a UTC calendar day — an export
filename, a database key — keep using `toISOString().slice(0, 10)`. The two
disagree either side of midnight.

#### One currency formatter

29 hand-rolled currency expressions, including five more local
`formatMoney`-style helpers, now call `formatCurrency` from `lib/format.ts`.
There are **zero** hand-rolled `₵${…}` value sites left.

`lib/format.ts` already had a currency-capable helper — `formatKpiValue({
currency: true })` — with **one importer**. Writing a shared helper is not the
hard part; the hard part is that nobody finds it.

Two defects in the pattern it replaces, both invisible until they are not:

1. **`toLocaleString()` takes the locale from the runtime.** A browser set to
   de-DE renders `1234.5` as `1.234,5` — the separators swap meaning. The
   admins are in Ghana; their machines and any server render are not
   guaranteed to be. `formatCurrency` pins `en-GH`.
2. **It allows three fraction digits.** `1234.567` rendered as `₵1,234.567`,
   which is not a currency amount. Capped at two.

**A visible change, deliberately made:** displayed amounts rendered as both
`₵` (42 occurrences) and `GH₵` (7). All *amounts* are now `₵`, from the single
`CEDI` constant — `/users` and `/ibp` premium tiers changed from `GH₵60` to
`₵60`. The three surviving `GH₵` are form labels naming the unit
(`label="Budget (GH₵)"`), which is legitimate copy, not formatting.

**Left alone deliberately:** the revenue chart's Y-axis
(`₵${Math.round(value / 1000)}k`) is a thousands axis, not a money value.
`formatCurrency(v, { compact: true })` would render `₵12.4K` and change the
chart, so only the symbol was centralised.

`formatCurrency` defaults to 0–2 decimals rather than forcing `.00`, because
the call sites already rendered `₵1,200` and adding decimals everywhere is a
visible change across every financial screen. Pass `decimals: 2` where
alignment matters — that is the better display for money and is worth adopting
screen by screen, not as a side effect of a refactor.

12 new unit tests in `tests/unit/format.test.ts` pin both defects and the
fallback behaviour. 85 unit+contract tests now pass.

### `pnpm build` earned its keep again

The currency work deleted `app/utils/helpers.js` after checking its importers
across `app components hooks lib actions stores utils`. **`constant/` was not
in that list**, and `constant/facility-labels-data.js` imported `formatDate`
from it.

`pnpm type-check` passed. The file is `.js`, and `tsconfig` sets
`checkJs: false` with an `include` of only `.ts`/`.tsx` — so tsc never looked
at it. `pnpm build` failed with `Module not found`, naming the file.

This is the sharp edge at the bottom of `CLAUDE.md` biting for real. When
checking importers, search the repo, not a remembered list of directories:

```bash
grep -rn --include='*.{ts,tsx,js,jsx,mjs}' "<module path>" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git
```

### E3.1 — Anatomy moved to `features/anatomy` — **done, needs review**

The exemplar the rest of E3 copies. **Review the shape before a second feature
moves** — that is the whole point of doing one first.

25 files moved. `features/anatomy/README.md` is the artefact to read.

```
features/anatomy/
  ui/       13 components (AnatomyPage + 11 tabs + AddBodyPartDialog)
  api/      10 route handlers, one module per endpoint
  data/     useAnatomy.ts (react-query) + ai-pin-mapper.ts
  schema/   types.ts (14 row/response shapes) + body-systems.ts
```

`app/` keeps one re-export per route and no logic:

```ts
export { GET, POST, DELETE } from "@/features/anatomy/api/drug-links";
```

**All 11 URLs are byte-identical** — verified against the build manifest, and
every one of the 9 GET endpoints returns 200 with real data through the
re-export. `/anatomy` renders with its 11 tabs and zero failing requests.

Three things done while holding the file, each defensible on its own:

- **The types were extracted to `schema/types.ts`.** `useAnatomy.ts` was 824
  lines of hooks and interfaces interleaved; it is 701 + 178 now. They are
  re-exported from the hook module so no call site changed.
- **The feature uses `lib/db/*` only.** All 12 modules were on the deprecated
  `@/lib/supabase*` shims. The shims are literal re-exports, so this is
  behaviour-neutral — but the exemplar should not teach the deprecated import.
- **`BODY_SYSTEMS` moved into `schema/`, which fixed a live bug.** See below.

#### The bug that justifies the `schema/` slot

`BODY_SYSTEMS` (nine systems) lived in `ui/AddBodyPartDialog.tsx`. A server
module cannot sensibly import a constant out of a dialog component, so
`api/body-map.ts` kept a **hand-copied subset in its zod enum — five of the
nine**, missing `general`, `digestive`, `muscular`, `urinary`, `reproductive`.

`BodyMapTab` defaults its filter to `general`. So
`GET /api/anatomy/body-map?bodySystem=general` returned **400 Invalid query
parameters** on first paint, and five of nine filter options were dead. The
route rejected a value its own `inferSystem()` produces as a fallback.

Confirmed pre-existing: the enum is byte-identical at `HEAD` before the move.

Both halves now import from `schema/body-systems.ts`. All ten filters return
200 (`all` 52 parts, `general` 13, `cardiovascular` 7, …) and `/anatomy` logs
nothing.

That is the argument for the layout in one example: the drift was not
carelessness, it was the directory structure making the correct thing
impossible.

### The sweep was green partly because it stopped watching too early

The nav block used `waitUntil: "domcontentloaded"`. These pages fetch after
hydration, so it sampled an empty shell — producing "rendered an empty body"
on a **rotating** handful of the slowest routes, green on the next run. Three
sessions lost time to it. It now uses `networkidle`, and the suite is stable
across repeated runs.

**Moving to `networkidle` immediately surfaced four broken pages** that the
old wait had been hiding. None is a regression; all four predate this branch:

| Route | Fault |
| --- | --- |
| `/bedtracker` | `GET /api/bedtracker` **500** — PostgREST cannot embed `ambulance_dispatches` with `facility_profile`: more than one FK, so the join needs an explicit hint |
| `/facilityscout` | `GET /api/facilityscout` **500** — same ambiguous-embed fault, `data_collectors` ↔ `user_profiles` |
| `/map` | `GET /api/map/collectors` **500** — `column user_profiles_1.email does not exist` |
| `/delete-account-request` | `get_delete_account_request_stats` **404 (PGRST202)** — the RPC genuinely does not exist. Unlike the `issue_canary` 404, which was a 42883 in disguise |

They are in `KNOWN_BROKEN` in the spec. Each entry carries its root cause, the
route is **still asserted to render**, and the test **fails if a quarantined
route comes back clean** — so the list cannot rot into a permanent excuse.
Fixing these four is the obvious next non-E3 task.

### The four surfaced bugs — **all fixed**, quarantine empty

`KNOWN_BROKEN` in the smoke spec is now `{}`. The sweep passes 59/59 with
every nav route rendering on a clean console, which had never been true before.

**Two ambiguous PostgREST embeds.** An embed with more than one candidate
foreign key does not pick one — it fails the whole query, so the route 500s
and the page renders its shell with no data:

| Embed | Candidates |
| --- | --- |
| `ambulance_dispatches` → `facility_profile` | `destination_facility_id`, `rerouted_from_facility_id` |
| `data_collectors` → `user_profiles` | `user_id`, `supervisor_id` |

Both now name the constraint. `facilityscout` had a **third** ambiguity hidden
behind the first — `facility_scout_submissions` has FKs to `user_profiles` on
both `submitted_by` and `reviewed_by`. Fixing one ambiguity can reveal another;
re-run after each.

**A column that does not exist.** `/api/map/collectors` selected
`user_profiles(… email …)`; `user_profiles` has no `email`. Removed. It is
genuinely unreachable from there — `user_profiles.user_id` points at
`auth.users`, which PostgREST does not expose, and `public."user"` has no FK to
join on. Surfacing it needs a service-role lookup or a view.

⚠️ While fixing that I put the explanatory comment **inside the select's
template literal**, so `//` became part of the select string and PostgREST
rejected the lot with a different 500. Comments go above the call.

**A migration that never landed.** `/delete-account-request` 404'd on
`get_delete_account_request_stats`. Checking `information_schema` rather than
trusting the one visible symptom showed the whole `20260812` migration was
absent: `grace_period_started_at`, the status CHECK, the status default and the
function. `expire_delete_account_grace_periods` **did** exist and reads
`grace_period_started_at` — so it had been broken since creation. Re-applied
as `20260905_reapply_epic21_delete_account_vocabulary.sql`.

The lesson generalises: when a migration's symptom is one missing object, check
whether the rest of the file landed.

### E3.2 — first migration: `facility-scout` — **done**

The E3.1 shape applied to a second feature, unchanged. 14 files.

```
features/facility-scout/
  ui/       FacilityScoutPage + 5 tabs + assign-dialog
  api/      6 handlers      data/  useFacilityScout.ts
  schema/   types.ts (4 shapes)
```

All 7 URLs unchanged. The page renders **2765 chars — byte-identical to the
baseline captured before the move** — with zero console problems.

**Dynamic routes work the same.** `[id]` folders stay in `app/`; only the file
they point at moved, and handlers still receive their `params`. Verified by
POSTing to each: the 404s that come back are the handlers' own JSON
(`{"error":"No matching reward rows"}`), while a control path returns Next's
HTML 404 page. Status alone would not have told them apart.

**`schema/` earned its slot again.** `FacilityScoutTabProps` lived in the page
component and all five tabs imported it from `../page` — so every tab depended
on the page module to know its own props, and the import broke the instant the
page was renamed. The resulting `TS7006 implicit any` errors in the tabs were
downstream of that one broken import, not four separate problems.

**Naming:** the directory is `facility-scout`, the route is still
`/facilityscout`. Feature directories are kebab-case and need not match the URL
— only `app/` is a URL. Renaming the route needs a redirect and is E3.3.

Two features migrated. The plan says prove the pattern on three small ones
before `period` and `fitness`; one more to go.

### The sweep's worker count — a net that cried wolf

`playwright.config.ts` ran 4 workers locally. Twice during this session that
produced 11-15 failures that looked exactly like real regressions — "rendered
an empty body" on the slowest pages, `ERR_NETWORK_IO_SUSPENDED` from
`page.goto`, 45-second timeouts on redirect assertions. All of it was
contention between the workers, one `next start` and one Supabase project in
eu-west-1. The same commit passes 59/59 at 2 workers, repeatedly.

It is now 2 everywhere. Raise it in CI first, on a dedicated box, if at all.

### E2.2 — one UI kit — **done**

`components/ui/` holds no `.jsx` files. The five legacy components that were
still live are TypeScript now, and the two dead ones are gone:

| Component | Consumers | Note |
| --- | --- | --- |
| `Icon.tsx` | 5 | props derived from Iconify's own via `Pick<ComponentProps<…>>` |
| `Pagination.tsx` | 3 | page list typed `number \| "start-ellipsis" \| "end-ellipsis"` |
| `Textinput.tsx` | 2 | react-hook-form `register` typed and optional |
| `Modal.tsx` | 4 | headless-ui v1 `Transition`/`Dialog` |
| `HtmlRenderer.tsx` | 4 | + `SafeHtmlRenderer` |
| ~~`ProgressBar/{Bar,index}.jsx`~~ | 0 | deleted — knip + zero importers |

**They were converted, not replaced.** `Modal` overlaps shadcn's `dialog.tsx`
and `Textinput` overlaps `input.tsx`, but swapping them is a visual change
across pages the smoke sweep does not cover, and it is not what "one kit"
needs to mean here. Conversion removes the real hazard — the extensionless
specifier ambiguity that made knip mis-report `button.tsx` — and it lands E5.1
for these files at the same time. Porting to shadcn stays available.

Two changes are not pure conversions and are commented in place:

- `HtmlRenderer`'s 161-line `<style jsx global>` block is now
  `styles/html-content.css`, imported by the component. The rules were already
  global — `jsx global` applies no scoping — so nothing about what they match
  changed, and Next code-splits the file to the pages that import it.
  Verified by computed style rather than by eye: `.html-content ul` resolves
  to `list-style-type: disc`, `display: list-item`, `padding-left: 22.5px`.
  Tailwind's preflight resets those, so if the stylesheet had failed to load
  the bullets would be gone.
- `Modal`'s controlled branch wrote `{!disableBackdrop && <div/>}`, handing
  `Transition.Child` the value `false`. Its types require an element, so the
  falsy arm is an empty `<div/>` now. Safe only because **`disableBackdrop`
  and `uncontrol` are never passed by any call site** — roughly 70 lines of
  `Modal` are dead configuration.

**Verification note.** A green sweep proves nothing about this change: every
consumer of these five components is under `/categories/**` or `/(auth)/**`
and none of those are nav routes. They were probed directly instead, and the
three that had a pre-change baseline render byte-identical bodies (1716, 1698,
1711 chars).

### Two bugs found while probing — **both fixed**

Both had one root cause, and it was not what the first pass reported.

**Correction to the earlier note in this file.** It said a PostgREST call was
being sent to `localhost:3000` instead of Supabase. That was wrong. The probe
printed `new URL(r.url()).pathname`, discarding the origin, and the origin was
then inferred rather than observed. Re-probed with full URLs, every request
goes to the correct Supabase host. Print the whole URL.

#### `gen_random_bytes` unreachable from a pinned `search_path`

Two `SECURITY DEFINER` functions call pgcrypto's `gen_random_bytes()` while
declaring `SET search_path = public`. In Supabase pgcrypto is installed into
the **`extensions`** schema, so the function is not on the path and every call
fails with SQLSTATE 42883.

Pinning `search_path` is correct hardening — it stops a caller shadowing an
unqualified name. It also makes every extension function unreachable unless
schema-qualified. Both functions were written unqualified.

| Function | Symptom |
| --- | --- |
| `public.issue_canary` | **HTTP 404** on the RPC |
| `public.start_admin_session` | **HTTP 500** from `/api/admin/session`, on every dashboard page load |

The 404 is the interesting one. **PostgREST maps SQLSTATE 42883 to HTTP 404**,
so a function that exists, is granted to `authenticated`, and has a matching
signature reported as "not found". It reads exactly like an unapplied
migration — which is what this file previously concluded. The only way to see
the real cause is to read the *response body*, not the status:

```
{"code":"42883","message":"function gen_random_bytes(integer) does not exist"}
```

Fixed in `supabase/migrations/20260905_fix_pgcrypto_search_path.sql` (applied)
by qualifying the calls as `extensions.gen_random_bytes(...)` rather than
widening `search_path`, which keeps the hardening.

Find the rest of this class with:

```sql
select p.proname, array_to_string(p.proconfig, ', ')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosrc ~ '(gen_random_bytes|\mcrypt\M|\mdigest\M|\mhmac\M|gen_salt)'
  and not p.prosrc ~ 'extensions\.'
  and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c
        where c like 'search_path=%' and c like '%extensions%'));
```

It returned exactly those two. Both are now clean, and `/dashboard`,
`/healthy_living`, `/diseases` and `/period` load with **zero failing
requests**.

**`SecurityCanary` has now issued its first token, ever.** It is in the DOM as
an invisible zero-box span, absent from the rendered page but present in an
`innerText` scrape — which is what AK-D7 was for. It has never worked in
production: before E1.1 the security layer never mounted, and once it did, the
RPC 404'd.

#### The `healthy_living` 404 was not a bug to fix

`GET /rest/v1/healthy_living` 404'd because **the table does not exist**. Nor
do the tables behind the two sibling trees. These pages were built against a
schema that has since been replaced:

| Legacy route | Queries | State | Live replacement |
| --- | --- | --- | --- |
| `categories/healthy_living` | `healthy_living` | dropped | `/healthy_living` → `healthy_living_info` |
| `categories/illness_and_complications` | `illness_and_conditions` | dropped | `/diseases` → `conditions` |
| `categories/period_tracker` | `tracker_logs` | dropped | `/period` |

Not a rename: the columns the pages read (`topic_name`, `about`, `headline`,
`more_information`) have no counterpart in `healthy_living_info`
(`name`, `slug`, `description`, `content`). Pointing the service at the new
table would have been a guess dressed as a fix.

All three trees had **zero inbound links**, were absent from the nav, and are
superseded by a live nav route. Deleted — 27 files: the 12 route files, the 7
service modules they were the only consumers of, and an 8-file
`period_tracker` island (`hooks/usePeriodTracker.js`, its utils, five unused
components and a stylesheet).

⚠️ **`components/period_tracker/TopicCategorySelect.tsx` was kept.** Five of
the six files in that directory were dead; that one is imported by
`/period/page.tsx` and `ai-hub/period/_components/Workspace.tsx`. A
directory-level delete would have broken two live pages. The first search that
suggested the whole directory was dead matched the bare string
`period_tracker` anywhere in a file — always match the import specifier.

### The saved smoke session expires

`tests/smoke/.auth/admin.json` goes stale, and when it does **every page
returns 200 with a plausible body** — the login screen, ~506 chars, reading
"This account doesn't have access to the admin dashboard". Six different
pages returning byte-identical 506-char bodies is the tell. It cost a false
regression report during E2.2. Refresh it with:

```bash
pnpm exec playwright test --project=setup
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
- ~~`lib/csv-export.ts` vs `lib/export-csv.ts`~~ — **done.** Ten implementations, not two; all now `lib/csv.ts`.
- ~~`components/ui/*.jsx` vs `*.tsx`~~ — **done.** No `.jsx` remains in
  `components/ui/`.

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
