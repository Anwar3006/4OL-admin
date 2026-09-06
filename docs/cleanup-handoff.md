# Cleanup — handoff

Branch `cleanup`. Last updated 5 Sept 2026.

**Read `CLAUDE.md` first** — it loads into every session and carries the four
rules that are not style preferences. This file is the state: what is done,
what is next, and what is still open.

The plan this follows: **Admin Blueprint Remediation** —
https://claude.ai/code/artifact/c9ad9c53-d0d8-4eb8-8dfe-bf7f4c3aea29

---

## Start here

```bash
pnpm install
pnpm type-check && pnpm lint && pnpm test        # fast gate, no credentials
pnpm build                                       # NOT optional after any move
pnpm knip                                        # dead-code evidence
```

The smoke sweep and the live RPC check need credentials:

```bash
export E2E_ADMIN_EMAIL='testsa@gmail.com' E2E_ADMIN_PASSWORD='mypassword'
pnpm build && pnpm start &                       # sweep runs against a build
E2E_BASE_URL=http://localhost:3000 pnpm test:smoke

# live RPC signatures (otherwise the test skips itself and reports "skipped")
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… pnpm test:contract
```

Current green baseline: **123 unit+contract assertions, 80 smoke tests, 0 lint
errors, clean build.** If you do not have that before you start, fix it before
changing anything — several bugs on this branch were only visible because the
baseline was trustworthy.

Supabase project: `rhbbxttxnvcziyqzptqs` (Postgres in `eu-west-1`).

---

## Working without Supabase access

If you are picking this up **without credentials for the Supabase project**,
read this first. Most of the remaining work is fine; a specific slice is not,
and one failure mode will actively mislead you.

### ⚠️ The suite looks green when it is half-blind

With no credentials, `pnpm test` reports:

```
Test Files  9 passed (9)
Tests  123 passed | 1 skipped (124)
```

**That "1 skipped" is the live RPC signature check** — the one that proves the
48 contracted Postgres functions still exist with the signatures the Expo app
calls. It skips deliberately so a fresh clone stays green, and skipping looks
almost identical to passing. This file's own trap list opens with that failure
shape for a reason.

You also cannot run **`pnpm test:smoke`** (80 tests). It needs a built app, a
live database and an admin login. That is the only thing in this repo that
proves a route is *reachable* rather than merely present — the build manifest
proves existence, never reachability.

**What you still have, and it is a lot:** `pnpm type-check`, `pnpm lint`,
123 unit + structural-contract assertions, `pnpm build`, and `pnpm knip`.
`pnpm build` in particular catches what `tsc` cannot, because `checkJs: false`
and an `include` of only `.ts`/`.tsx` leave 52 files unchecked.

### Safe — the offline gate proves these completely

| Task | Why it is fully covered |
| --- | --- |
| **E5.1** convert `.js`/`.jsx` | **Already done.** Zero remain in app code. |
| **E5.3** lint `redesign/**` | **Already done.** It was a no-op: that directory holds no code. |
| **E6.2** prune dependencies | `pnpm knip` finds them, `pnpm build` proves nothing needed them. |
| **E6.1** delete dead **files** | grep for the import specifier, `knip`, **and** absence from `.next` build artifacts — all three work offline. See the note below. |
| **E3.4** split `lib/`         | **Done.** Feature-owned modules moved out; `reports/` and `supabase/indexAdmin.ts` retired; the three pure re-export shims deleted after migrating 129 callers. `lib/supabase.ts` (anon client) survives with 2 callers that need database verification. |
| **E6.3** move the 4.1 MB seed JSON | Only `scripts/seeder.ts` reads it — no app code imports it, so the build proves the move. Running the seeder needs a database; moving the file does not. |
| **E7** documentation | No execution required. |

**The third proof, offline.** Rule 3 wants two proofs and grep and knip each
have a blind spot. A third, which needs no database, is whether the file
appears in a real build artifact:

```bash
pnpm build
grep -rl 'YourComponent' .next | grep -v tsbuildinfo
```

Exclude `.tsbuildinfo` — it lists every file `tsc` *read*, not what shipped.
This is what proved `users/_components/view-user-dialog.jsx` dead while its
`.tsx` twin was live, in a case where knip reported the opposite.

### Doable, but the net is thinner — say so in the commit

| Task | What you can prove | What you cannot |
| --- | --- | --- |
| **E4.1** split `ai/page.tsx` (1,236 lines) | It compiles and builds | That each tab still renders. The Period split captured a live per-endpoint baseline first; you cannot. Split by tab, keep every block verbatim, and say in the commit that only compilation was verified. |
| **E4.2** `stores/dialog-store.ts` | Types line up across all callers | That dialogs still open. It is a typed Zustand store, so `tsc` covers most of the risk — but not wiring. |
| **E9** extract the blueprint | Structure and docs | Anything runtime. |

### Do not attempt without access

- **E5.2 generated DB types** — definitionally needs introspection. There is no
  `gen:types` script yet; adding one is fine, running it is not.
- **E3.3 route renames** (`/healthy_living`, `/facilityscout`, `/bedtracker`) —
  the guard *is* the smoke sweep. You can write the `next.config.ts` redirect
  and the assertion, but you cannot run the assertion, and a redirect that
  silently fails is precisely this repo's worst failure mode. Leave it.
- **Deleting or moving any route** — reachability needs the sweep. Deleting a
  dead *file* is fine; deleting a `route.ts` is not.
- **Anything touching RLS, policies, grants or migrations** — E1.3 is finished,
  but do not extend it blind.
- **Adding entries to `CONTRACT_RPCS`** — each needs its live signature pinned
  in `rpc-signatures.json`. Adding a name without the verified signature makes
  the suite assert something nobody checked.

### If you change a contracted route anyway

The seven `/api/chat/*`, four `/api/period/*`, and the `/api/jobs/attachment`,
`/api/medenquiry/attachment` and `/api/fitness/generate` entries are frozen for
mobile. `tests/contract/api-routes.test.ts` runs **without** credentials and
follows re-exports, so it does still protect the *structure* — route exists,
verbs unchanged. That part of the net is intact. What is not intact is the RPC
signature half.

---

## Where the work stands

| Epic                           | State                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E0** safety net              | **Done and running.** Contract suite, smoke sweep, CI with a build job.                                                                                                                                 |
| **E1.1** duplicate layout      | **Done.** One `layout.tsx`; the security layer executes for the first time.                                                                                                                             |
| **E1.2** Supabase clients      | **Done.** Five → three under `lib/db/`, plus `isolated-auth.ts` for the one flow that needs a separate session. The fourth client E1.2 missed (`app/utils/supabaseClient.js`, a `.js` file) is deleted. |
| **E1.3** RLS/idiom audit       | **Done.** Silent-empty direction clear; all 9 tables exposed to `anon` are closed. No table in the database still grants `public`/`anon` unrestricted ALL/UPDATE/DELETE.                                |
| **E1.4** data-access rule      | **Done.** `lib/db/README.md`, summarised in `CLAUDE.md`.                                                                                                                                                |
| **E2.1** retire duplicates     | **Done.** 12 redirect stubs → `next.config.ts`; 22 + 27 dead files deleted.                                                                                                                             |
| **E2.2** one UI kit            | **Done.** No `.jsx` under `components/ui/`.                                                                                                                                                             |
| **E2.3** one CSV/date/currency | **Done.** 10 CSV impls → `lib/csv.ts`; moment gone; `formatCurrency` in `lib/format.ts`.                                                                                                                |
| **E3.1** feature layout        | **Done.** `features/anatomy` is the exemplar.                                                                                                                                                           |
| **E3.2** migrate features      | **DONE.** 28 features under `features/`, each with a README. `hooks/supabase-calls/` no longer exists — `tests/unit/feature-layout.test.ts` asserts it stays gone.                                      |
| **E3.3** kebab-case routes     | **Partial.** The 17 hollow `/facilities/*` shells are retired behind redirects and guarded by the sweep. The naming work (`/healthy_living`, `/facilityscout`, `/bedtracker`) is not started.           |
| **E3.4** split `lib/`         | **Done.** Feature-owned modules moved out; `reports/` and `supabase/indexAdmin.ts` retired; the three pure re-export shims deleted after migrating 129 callers. `lib/supabase.ts` (anon client) survives with 2 callers that need database verification. |
| **E4.1** god files             | **Period done** (4,585 lines → 889 + 16 files) and now migrated into `features/period`. `ai/page.tsx` (1,236) next.                                                                                     |
| **E4.2** dialog store          | **Not started.** `stores/dialog-store.ts`, 30 KB, global.                                                                                                                                               |
| **E5.1** convert `.js/.jsx` | **Done.** Zero `.js`/`.jsx` left in app code (was 79, then 52). `@types/google.maps` added so the map container could use real Maps types rather than `any`. |
| **E5.2** generated DB types    | **Not started.** Every `schema/types.ts` is hand-written and can drift.                                                                                                                                 |
| **E5.3** lint everything       | **Done — and it was a no-op.** The exclusion is gone, but `redesign/**` holds no code (9 files: markdown, SQL, a PNG). The live components are in `components/redesign/`, which was never excluded. |
| **E6.1** knip                  | **Done.** knip reports **0 unused files and 0 unused dependencies**. |
| **E6.2** prune deps            | **Done.** 120 → 82 runtime deps (21 → 17 dev). `tailwindcss-animate` is a knip false positive — loaded from CSS — and is now in `ignoreDependencies`. |
| **E6.3** seed data out of tree | **Not started.** `constants/liftmanual_all_workouts.json` is 4.1 MB.                                                                                                                                    |
| **E7** documentation           | **Partial.** `CLAUDE.md`, three feature READMEs, `knip.README.md`, this file.                                                                                                                           |
| **E8** mobile contract         | **Done.** 31 routes / 48 RPCs / 38 tables, all verified live. The verb check now follows re-exports. The chat migration added 3 RPCs that frozen routes delegate to.                                    |
| **E9** extract the blueprint   | **Not started.**                                                                                                                                                                                        |

---

## Do next, in order

### 1. E3.4 — split `lib/`, and finish E3.3's naming work

E3.2 is done: 28 features, `hooks/supabase-calls/` gone, and a unit test that
fails if it comes back. What is left of E3 is the two smaller parts.

**E3.4** — `lib/` still mixes genuinely shared infrastructure (`db/`, `csv.ts`,
`format.ts`, `admin-api-auth.ts`, `masking.ts`, `rate-limit.ts`) with things
that belong to one feature. The migrations pulled out `period-*`,
`fitness/generate-plan`, `ibp-constants`, `map-coverage`, `chats-constants`,
`drug-import-mapping` and `gpx` as they went, so what remains is closer to
correct than it was — but `reports/`, `supabase/indexAdmin.ts` and the
deprecated `supabase*.ts` shims still want a decision.

**E3.3** — the facilities slice is done. The naming work is not:
`/healthy_living` (underscore), `/facilityscout` and `/bedtracker`
(unseparated). Each needs a `next.config.ts` redirect and a smoke assertion,
exactly like the 18 added for facilities and marketing.

### 2. `app/utils/supabaseClient.js` — resolved, 6 Sept 2026

`CLAUDE.md` rule 1 lists three clients. For a while there were four:
`app/utils/supabaseClient.js`, a plain `createClient` holding its session in
**localStorage rather than cookies**, so it queried as **`anon`**. It survived
E1.2 because it is a `.js` file, and four of its six importers are `.jsx`/`.js`
and therefore never type-checked. It is gone; rule 1 is true again.

Each importer was measured as `anon` and resolved on its own terms:

| File                                             | Was                                           | Now                                            |
| ------------------------------------------------ | --------------------------------------------- | ---------------------------------------------- |
| `medication-reminder/ui/ReminderDetailsPage.jsx` | read `medication_reminders`, saw 0 of 3       | `getBrowserClient()` — renders                 |
| `utils/activityLogger.js`                        | read `activity_logs`, saw 0 of **10,977**     | **deleted** — dead on three proofs             |
| `app/api/places/route.js`                        | read `api_usage`, which does not exist        | **deleted** — always 500'd                     |
| `app/services/fetchNearbyPlaces.js`              | its only caller                               | **deleted** — dead with it                     |
| `view-facility-profile/page.jsx`                 | worked only via a `TO public` policy          | `getBrowserClient()` — renders                 |
| `view-reviews/page.jsx`                          | read `facility_ratings`, which does not exist | `getBrowserClient()` — still broken, see below |
| `(auth)/delete-account/page.tsx`                 | isolated on purpose                           | `lib/db/isolated-auth.ts`                      |

Two of those deserve more than a table row.

**`delete-account` was right all along.** It is a public page that signs a user
in, writes their deletion request, and signs them out. Moving it to
`getBrowserClient()` would have been an active regression: cookies are where
the admin panel keeps its session, so a visitor's `signInWithPassword` would
replace the signed-in admin's session and the `signOut` would log the admin
out. The isolation was the feature. It now has an explicit, documented home in
`lib/db/isolated-auth.ts` — one caller, and it should stay that way. Note the
client is constructed at **module scope** there: the sign-in, the insert and
the sign-out must share one client or the insert never sees the session.

**`view-reviews` is still broken, and not because of its client.** It reads
`facility_ratings`, a table that does not exist — the real one is
`facility_reviews`. Confirmed in a browser: the page sits on "Loading …"
forever. Nothing links to it and it is already in the sweep's orphan list. It
needs the same decision the `/facilities/*` shells got: fix the table name and
the column mapping, or retire the route. **Not** a client problem, so it was
not fixed while pretending it was.

`app/utils/uploadMedia.js` still sits in that directory and knip flags it as
unused; it was out of scope here and is untouched.

### 3. E1.3 — swept and fixed; all nine closed

**The sweep is done. It found nothing in the direction it was aimed, and
something worse in the other direction.**

#### The query in this file was wrong

The version previously shipped here flagged tables with no policy naming
`authenticated`. In Postgres `public` is not "the public schema" and not
"logged-in users" — it is **every** role. A policy `TO public` therefore does
cover `authenticated`, and the old query reported 72 tables of which 23 were
false positives. Corrected:

```sql
select c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relrowsecurity and c.relkind='r'
  and not exists (
    select 1 from pg_policies p
    where p.schemaname='public' and p.tablename=c.relname
      and (p.roles && array['authenticated','public']::name[]));
```

That returns **49** genuinely invisible tables. Cross-referenced against every
browser-, legacy- and server-client call site in the tree: **no intersection.**
No feature is currently reading a table that is invisible to it. The bug class
that broke `healthy_living_body_parts`, `fitness_body_parts` and
`drug_body_parts` has no live instances left.

#### What the sweep found instead

Nine tables carry `admin_full_access_*` policies written as
`FOR ALL TO public USING (true)`, plus blanket `GRANT ALL … TO anon`. The name
says admin; the grant says everyone. Querying **as the `anon` role**:

| Table            | Readable as anon                                                                        |
| ---------------- | --------------------------------------------------------------------------------------- |
| `admin_sessions` | **701 rows** — `session_token`, `ip_address`, `user_agent`, `location`, all `is_active` |
| the other eight  | 0 rows — because they are _empty_, not protected                                        |

The anon key is `NEXT_PUBLIC_*`. It ships in the web bundle and in every
installed Expo build. Treat all 701 session tokens as disclosed.

`supabase/migrations/20260905_e13_revoke_public_admin_table_access.sql` fixed
eight of the nine and **has been applied.** It was safe for those eight: each
is read only from `app/api/**` via `getAdminClient()`, and `service_role` has
`rolbypassrls = true`, verified call site by call site.

Verified after applying, by querying as each role: all eight now return
**42501**, a hard permission denial rather than a silent empty set; service
role still reads all 701 sessions, so the dashboard is unaffected.

One correction worth copying: the blanket `revoke` also took the grant behind
`content_moderation_flags_select_admin`, a **correctly** scoped
`TO authenticated USING (is_app_admin())` policy — silently disabling a
deliberate access path. `SELECT` was granted back. When you revoke broadly,
check what else was standing on that grant.

**All nine are now closed.** `fitness_content_schedule` was the last; its read
moved to `/api/fitness/content-schedule` first, then the policy was dropped —
verified as each role (anon and authenticated both 42501, service role
unchanged) and with 59/59 smoke tests after. Re-running the over-exposure query
now returns **zero rows**: no table still grants `public`/`anon` unrestricted
`ALL`/`UPDATE`/`DELETE`.

The `TO public` SELECT policies that remain — `facility_profile`,
`facility_reviews`, `faq_categories`, `fitcoin_tiers`, `marketing_*` — are
deliberate public-read catalogues. Left alone on purpose.

**On the `admin_sessions` rows — an earlier note in this file overstated the
risk, and the correction matters.** `session_token` is **not a credential**:
`requireAdminApiUser()` never consults `admin_sessions`, and every endpoint
that accepts a `sessionToken` authenticates the caller first and uses the token
only to select a row. Real auth is the Supabase JWT in cookies, which was never
in that table. So a leaked token does not permit sign-in or session hijacking,
and "rotating" them would have achieved nothing.

What _was_ disclosed is still worth knowing: `admin_id`, `ip_address`,
`user_agent`, `location` and activity times. PII and opsec, not access.

The real defect that surfaced while checking: **nothing ever closed a session
row.** Not one row in the table had `ended_at` set — not the 24 from real
August use, not the 1,328 the smoke sweep created. The only thing that ends a
session is a `DELETE` fired from the `SIGNED_OUT` handler, and closing a tab or
a headless browser never fires it. `get_admin_dashboard_metrics` counts
`distinct admin_id`, so `online_now` was never wrong; the cost was the
per-admin device list and unbounded growth. Fixed by
`expire_stale_admin_sessions(30)` on a `*/15` cron — see the migration table.

**`fitness_content_schedule` is excluded on purpose.** It is the one of the
nine still read from the browser — `hooks/supabase-calls/useFitnessContentSchedule.ts`,
on the legacy anon client. Dropping its policy would blank that feature
silently. It gets fixed when `features/fitness` moves that read behind an API
route, which is the task above this one.

#### Also worth knowing

- **A head count is the wrong instrument on a row-scoped table.** The anatomy
  Connected Modules tab counted `drugs` from the browser and got 2,633 of
  3,530 — RLS scoped the count and nothing errored.
- **Two of its seven cards counted tables that do not exist** (`hcp_profiles`,
  `facilities`), so `headCount` returned `-1` and both cards rendered
  "Not available" permanently. Fixed to `hcp_verifications` and
  `facility_profile`. A regex sweep for `.from("literal")` will not find this
  class — the call was `.from(table)` over a config array.

### 4. E3.3 — kebab-case routes (facilities slice done)

The `/facilities/*` shells are **retired**. What remains of E3.3 is the naming
work: `/healthy_living` (underscore), `/facilityscout` and `/bedtracker`
(unseparated), each of which needs a redirect the same way.

The facilities slice is the worked example. Seventeen hand-written `.jsx`
pages each rendered an empty div, their real component commented out and the
directory those comments named long gone — and because **a static segment
beats a dynamic one in Next**, ten of them shadowed `/facilities/[type]`,
which is a complete working listing. Measured before the change:

```
/facilities/hospitals   18,396 bytes   no search box, no type header
/facilities/pharmacy    21,962 bytes   renders "Pharmacy" and the search box
```

Deleting the shells alone would **not** have fixed it: the legacy slugs do not
match the data (`facility_type` is `dental_clinic`, `home`, `pharmacy`, while
the pages were `dental`, `homes`, `pharmacies`), so falling through to `[type]`
would render an empty table for a type that does not exist. The fix maps each
legacy slug onto its real `FACILITY_TYPE_ENUM` value and redirects to
`/facilities?type=…`, which already filters (`.eq("facility_type", type)`).

All 18 redirects live in `next.config.ts` beside the E2.1 batch, for the reason
documented there — a redirect declared in config runs ahead of rendering, while
the two `page.jsx` stubs this replaced were `"use client"` components calling
`router.replace()` inside `useEffect`, so the dashboard shell rendered first.

**The sweep now guards all of it**: 18 redirect assertions plus one that
`/facilities/[type]` still renders, since retiring the shells is only correct
if the route they shadowed works. 59 smoke tests → 78.

One wrinkle worth keeping: `hospital_/_clinic` is a real `facility_type`
containing a slash. `next.config.ts` writes `%2F`; the browser normalises it
back to a literal slash in the query string. Both forms filter identically —
verified against `/api/facilities` — so the smoke expectation asserts the
normalised form, which is what actually lands.

### 5. E4.1 continued — `ai/page.tsx` (1,236 lines), then `stores/dialog-store.ts`

Use the Period method: **capture a per-endpoint or per-tab baseline first**,
split, then diff against it. That is what made a 1,166-line extraction safe to
claim.

---

## Pending items — deferred, not forgotten

Logged here because they were raised mid-task and consciously postponed.

### `reply_to` was silently dropped on the support email

`app/api/support/route.ts` passed `reply_to: email` to Resend, which expects
`replyTo`. The typed client rejects the snake_case key — but the file was
`.jsx` and unchecked, so it compiled and shipped with the field discarded.
Support replies went to the from-address instead of the person who wrote in.
Fixed during E5.1. Worth knowing because the same shape can hide in any
untyped call into a typed SDK.

### AWS SES is not configured — email does not send

`lib/email.ts` is written and wired, but nothing has been set:

```
AWS_REGION              already in .env.example as eu-north-1
SES_FROM_EMAIL          must be a VERIFIED SES identity in that region
AWS_ACCESS_KEY_ID       omit both if the runtime supplies a role
AWS_SECRET_ACCESS_KEY
SES_CONFIGURATION_SET   optional, bounce/complaint tracking
```

Two things likely to bite:

1. **`AWS_REGION` is `eu-north-1` while Postgres is `eu-west-1`.** SES only
   sees identities verified in its own region, and the failure reads
   _"Email address is not verified"_ — which looks like a verification problem
   rather than a region one. Check the region first.
2. **A new SES account is sandboxed** until AWS grants production access, and
   can only send to verified addresses.

Until it is set, `missingEmailConfig()` names the absent variable and the
device-OTP route refuses **before** issuing a code — issuing one it cannot
deliver would burn the 60-second resend cooldown.

**Affected:** admin invites, admin login alerts, device sign-in OTP.

### Four messaging providers, should be two

| Channel | Live                                  | Also present                                |
| ------- | ------------------------------------- | ------------------------------------------- |
| SMS     | `lib/sms.ts` — AWS End User Messaging | `lib/twilio.ts` (one file imports **both**) |
| Email   | `lib/email.ts` — AWS SES              | `resend` in `app/api/support/route.js`      |

Decide and delete the losers.

### Smaller, still open

- **`redesign/**` is not what earlier notes here claimed.** This file used to
  say `PageHeader` (36 importers) and `KpiCard` (52) were "very much alive
  inside it". They are not — they live in `components/redesign/`, a
  **different** directory that has never been excluded from eslint or knip.
  The root `redesign/` holds nine files and every one is documentation, SQL or
  an image, which is why removing the eslint exclusion (E5.3) changed the lint
  output by exactly zero problems.
- **The email password-reset flow has no implementation, and never had one on
  this branch.** Converting the auth pages under E5.1 surfaced it: both
  `/reset-password` and `/verify-otp` called bare identifiers —
  `resetPassword(...)` and `verifyOtpSentToEmail(...)` — that are defined
  nowhere in the repo, so submitting either form threw `ReferenceError`. They
  were invisible because the files were `.jsx` and `tsconfig` type-checks only
  `.ts`/`.tsx`. `/forgot-password` completes the set: its component is
  commented out and points at `components/redesign/auth/`, the same deleted
  directory the hollow `/facilities/*` shells referenced.

  **Do not wire these to `/api/verify-otp`.** It is the obvious move and it is
  wrong: that route verifies a PHONE NUMBER over SMS
  (`checkVerificationCode(phoneNumber, otp)`), while these pages carry an
  email from `localStorage`. Connecting them would pass an email where a phone
  number is expected and appear to work until someone used it.

  Nothing in the app links to any of the three routes. The pages now throw an
  explicit, named error instead of an undefined-variable crash — same failure,
  legible — and each carries a header explaining the situation. **Rebuilding
  or retiring the flow is a product decision**, and rebuilding needs auth and
  database verification this session could not do.

- **Two files still read through the anon client.**
  `features/medication-reminder/ui/MedicationStats.tsx` and
  `components/editor/plugins/drag-drop-paste-plugin.tsx` import `supabase`
  from `lib/supabase.ts`, whose session lives in localStorage rather than
  cookies — so they query as `anon`, and an RLS-protected table returns an
  empty set without erroring. This is the shape that already broke
  `view-medication-reminder-details`. **MedicationStats is the one to check
  first**: it renders counts, and a count of zero looks like real data.
  Verifying either needs credentials, so both were left alone rather than
  swept. Everything else is off the deprecated shims; the other three are
  deleted.
- **`constants/liftmanual_all_workouts.json` is 4.1 MB** and is why the build
  needs a 4 GB heap.
- **53 files knip calls unused.** Each still needs the two-proof rule.
- **`anatomy_hotspots` (2D) is empty and always has been** — the admin Body Map
  falls back to region cards because of it. `anatomy_hotspots_3d` is in use.
- **The repo root holds ~700 KB of gap-analysis and TASKS files.** Project
  history, not architecture. Archive in E7.4.

---

## Traps proven on this branch

Each of these cost real time. They are the reason `CLAUDE.md` rule 3 says two
proofs.

### A check that cannot run reports the same thing as a check that passes

This branch's defining bug shape, hit four separate ways:

- **The contract regeneration script had never run.** It gated on
  `command -v rg`, which succeeds when a shell defines `rg` as a _function_
  and then fails inside its own bash subshell. The mobile contract was
  therefore never diffed against the Expo repo, and was protecting **16 of 31
  routes**. It falls back to `grep` now.
- **The smoke sweep sampled pages before they loaded** (`domcontentloaded`),
  so it was green partly because it stopped watching. Switching to
  `networkidle` immediately surfaced four broken pages.
- **The RPC signature test skipped itself** without credentials — it says
  "skipped", which is honest, but nobody had ever run it.
- **`app/[...not-found]` answers every missing route with HTTP 200**, so a
  `status >= 400` check never fires. Missing routes must be recognised by what
  they render.

### PostgREST reports SQL errors as HTTP 404

`issue_canary` existed, was granted to `authenticated`, and had a matching
signature — and returned **404**. The cause was SQLSTATE 42883 from an
unqualified `gen_random_bytes()`: pgcrypto lives in the `extensions` schema and
the function pinned `search_path = public`. **Read the response body, not the
status.**

Same class: a route in the contract can delegate to an RPC that is not, and the
RPC is then free to vanish. `/api/auth/device-sign-in/send-otp` did exactly
that.

### An ambiguous PostgREST embed fails the whole query

Two FKs between the same pair of tables and an unqualified embed does not pick
one — it 500s the route and the page renders its shell with no data. Name the
constraint: `facility_profile!ambulance_dispatches_destination_facility_id_fkey`.
Fixing one ambiguity can reveal another behind it.

### Do not probe a mutating endpoint with an empty body

The "prove the handler runs, don't infer it from a status" recipe below is for
**GET**. Applied to `PUT /api/symptoms/[id]/feature` with `-d '{}'` it did
something else: the zod schema declares `featured: z.boolean().default(true)`,
so an empty body means _feature this thing_, and the route obligingly ran
against production with a made-up id.

Nothing was written — `setCarouselSlots` only ever `UPDATE ... WHERE id = ?`,
and no row matched — but that was luck, not care. For a mutating verb, either
send a body that is explicitly inert (`{"featured":false}`), or use an id you
have already confirmed does not exist, and check the table afterwards.

It did surface a real bug, which is the only reason it is written up rather
than quietly forgotten: the route replied `{"ok":true,"updated":1}` for an id
that matched nothing. `setCarouselSlots` incremented its counter once per id it
looped over instead of counting rows affected, so featuring a deleted id
reported success and wrote an audit line describing a change that never
happened. The unfeature path in the same function used `.select("id")` and
counted honestly, so the two halves disagreed. Fixed.

### A "sweep the whole repo" grep with a directory allowlist is not one

The marketing migration's stale-reference check listed
`app components features hooks lib schemas types stores scripts` — a list that
looks exhaustive and is not. `constants/marketing.const.tsx` imported a moved
schema and the sweep reported clean. `tsc` caught it a minute later, but only
because the importer happened to be `.tsx`; under `constants/*.js` it would
have reached `pnpm build` at best.

Grep the repo root and exclude `node_modules` and `.next`, rather than naming
the directories you expect to matter.

### Cross-feature imports come in at least four shapes

Grepping for `@/` finds one of them. The facilities migration hit three more,
each caught only by `tsc` after the source directory was already gone:

| Shape                                 | Example                                                            | Found by                |
| ------------------------------------- | ------------------------------------------------------------------ | ----------------------- |
| absolute into `app/`                  | `@/app/(dashboard)/fitness/_components/user-search-select`         | grep for `from "@/app/` |
| sibling-relative                      | `../facilities/_components/view-facility-dialog` from `medenquiry` | `tsc`                   |
| same-directory                        | `./useFacilities` from `useReviews.tsx`                            | `tsc`                   |
| parent-relative out of the moved file | `../types/formInput` inside a moved schema                         | `tsc`                   |

The last one is the nastiest: the file itself is fine before and after, but its
relative specifier silently re-points at a **different** directory once moved,
and if a file happens to exist at the new path it resolves to the wrong module
with no error at all. After moving anything, `grep -rn 'from "\.' ` the new
directory and confirm every hit still means what it did.

### A cross-feature import can hide behind an absolute path

The migration guidance says to grep a moved feature's `ui/` for
`from "../page"`. Fitness had none — and still had the same class of problem,
one level up. The Map feature imported a picker from
`@/app/(dashboard)/fitness/_components/user-search-select`: an absolute
specifier into another feature's private `_components` directory, which no
relative-import sweep sees and which `tsc` only complains about _after_ the
directory is gone.

**Grep for `from "@/app/` as well.** Two hits in this tree; the fitness one is
now `components/UserSearchSelect.tsx`, since a generic user picker used by two
features belongs in neither.

### Route segment config does not survive a re-export

`export const runtime = "nodejs"` is read by Next's static analysis of the
route file itself. Move it into a feature module and re-export the handler,
and the config is silently gone — nothing errors, nothing warns. It stays in
`app/`. (In Next 16 `nodejs` is the default and `edge` is deprecated, so the
period routes lost nothing either way — but do not rely on that for a route
that sets `maxDuration`.)

### A structural check can fail a refactor it should have allowed

`tests/contract/api-routes.test.ts` matched `export function GET` in the route
file. Once a contracted route became a re-export, all four period routes
reported "no longer exports GET" — a true-looking failure about a route that
was fine. The fix was to follow the specifier and read the verbs from the
module that defines them, **not** to relax the regex into a substring match:
that would have turned a real check into a decorative one.

It was mutation-tested before being trusted — rename the handler's `GET`,
delete the handler module, and name a verb in the re-export that the handler
does not define. All three fail. A check nobody has seen fail is not evidence.

### grep is fooled by substrings; knip by extensionless specifiers

- `AdminDashboardShell` returned three hits, all inside `NewAdminDashboardShell`.
  Search for the **import specifier**.
- knip reports `components/ui/button.tsx` unused. It has 143 importers — a
  `Button.jsx` sibling makes `@/components/ui/button` ambiguous. See
  `knip.README.md`.
- A search for the bare string `period_tracker` said a whole directory was
  dead; one file in it had two live importers.

### A migration in the repo may be half-applied, or not applied at all

`20260812_epic21_delete_account_status_vocabulary.sql` was committed and never
landed: one function from it existed, the column that function reads did not.
When a migration's symptom is one missing object, **check whether the rest of
the file landed** with `information_schema`, not by reading the file.

### Do not `rm -rf .next` while `next start` is running

The old process keeps serving, finds no chunks, returns 500s with `text/plain`,
and 15 nav routes fail with error boundaries — which reads exactly like a real
regression. `pkill -f "next start"; lsof -ti:3000 | xargs kill -9` first.

### The saved smoke session expires

When it does, **every page returns 200 with a plausible body** — the login
screen, ~506 chars, "This account doesn't have access". Six pages returning
byte-identical 506-char bodies is the tell. Refresh:
`pnpm exec playwright test --project=setup`.

### Shared types end up in whichever file declared them first

All three migrated features had one: `BODY_SYSTEMS` in a dialog (so the API
kept a hand-copied subset of 5 of 9, and a filter 400'd for months),
`FacilityScoutTabProps` and `BedTrackerTabProps` in their page components. With
no `schema/` slot there is nowhere neutral to put a shape two modules share.

**After moving a feature, grep its `ui/` for `from "../page"`.**

---

## Verification recipes that earned their keep

- **Before splitting a large file, capture a baseline.** For the period route
  that meant recording status + response keys for all 14 tabs, then diffing
  after — byte-identical, which is a claim worth making. Without it the only
  evidence is that it compiles.
- **Prove a handler runs, don't infer it from a status.** POST to it and read
  the body: a handler's own `{"error":…}` JSON means it ran; Next's HTML 404
  page means the route is gone. `bed-tracker` legitimately returns 404 and 409
  on a nonexistent id.
- **Check computed style, not the screenshot,** when moving CSS. Tailwind's
  preflight resets `list-style`, so a failed stylesheet silently deletes
  bullets.
- **`pnpm build` catches what `tsc` cannot.** `checkJs: false` and an `include`
  of only `.ts`/`.tsx` mean 55 files are never type-checked. A deleted module
  imported by one of them fails only at build.

---

## Database changes on this branch

All applied to `rhbbxttxnvcziyqzptqs` and mirrored into `supabase/migrations/`.

⚠️ **The repo files and the applied list are not one-to-one.** The OTP work was
applied as two migrations (`device_sign_in_otp_functions`, then
`device_sign_in_otp_issued_at` when testing showed the resend cooldown never
fired); the repo carries **one** file containing the corrected end state, so a
replay reaches the same place by a shorter path. Likewise the delete-account
fix is `apply_epic21_delete_account_status_vocabulary` in the database and
`20260905_reapply_epic21_delete_account_vocabulary.sql` in the repo. Compare on
content, not on name — and `supabase.list_migrations` is the record of what the
database actually has.

| Migration                                               | What                                                                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20260905_contract_rpc_signatures_reader.sql`           | read-only `pg_proc` reader for the contract test                                                                                                                                                             |
| `20260905_fix_pgcrypto_search_path.sql`                 | qualified `extensions.gen_random_bytes` in `issue_canary` and `start_admin_session`                                                                                                                          |
| `20260905_reapply_epic21_delete_account_vocabulary.sql` | re-applied a migration that never landed                                                                                                                                                                     |
| `20260905_device_sign_in_otp_functions.sql`             | wrote the two missing OTP functions, and adds `otp_issued_at`                                                                                                                                                |
| `20260905_e13_revoke_public_admin_table_access.sql`     | E1.3: dropped 8 `admin_full_access_*` policies that were `TO public USING (true)`, revoked the matching anon/authenticated grants, restored `SELECT` for the one correctly scoped policy that depended on it |
| `20260905_e13_close_fitness_content_schedule.sql`       | E1.3: the ninth, after its browser read moved to `/api/fitness/content-schedule`                                                                                                                             |
| `20260906_admin_sessions_expire_stale.sql`              | `expire_stale_admin_sessions()` + `*/15` cron; nothing had ever closed a session row. Backfill closed 1,178                                                                                                  |

Earlier session (anatomy): `body_parts` path trigger, junction backfills tagged
`source='heuristic'`, `get_anatomy_body_part_bundle(p_preview_limit)`,
`get_anatomy_region_content(p_include_items)`, paging RPC, indexes on
`fitness_body_parts` and `healthy_living_body_parts`.

**Do not "simplify" `tests/contract/rpc-signatures.test.ts` into speculative
RPC calls** — several contracted RPCs are volatile and would write rows to
production.

---

## Things that are true and easy to forget

- `AGENTS.md` is regenerated by `next dev`. Project rules go in `CLAUDE.md`.
- `public/anatomy/scene.html` and the GLBs are duplicated in the Expo repo and
  hand-synced. Changing one means changing both.
- `next-env.d.ts` flips between `.next/types` and `.next/dev/types` depending on
  whether `build` or `dev` ran last. Harmless churn.
- The mobile app is at `../4-Our-Life-App`. Regenerate the contract before any
  release that moves a route, renames an RPC, or tightens an RLS policy.
