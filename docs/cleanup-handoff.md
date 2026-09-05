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
export E2E_ADMIN_EMAIL='…' E2E_ADMIN_PASSWORD='…'
pnpm build && pnpm start &                       # sweep runs against a build
E2E_BASE_URL=http://localhost:3000 pnpm test:smoke

# live RPC signatures (otherwise the test skips itself and reports "skipped")
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… pnpm test:contract
```

Current green baseline: **121 unit+contract assertions, 59 smoke tests, 0 lint
errors, clean build.** If you do not have that before you start, fix it before
changing anything — several bugs on this branch were only visible because the
baseline was trustworthy.

Supabase project: `rhbbxttxnvcziyqzptqs` (Postgres in `eu-west-1`).

---

## Where the work stands

| Epic | State |
| --- | --- |
| **E0** safety net | **Done and running.** Contract suite, smoke sweep, CI with a build job. |
| **E1.1** duplicate layout | **Done.** One `layout.tsx`; the security layer executes for the first time. |
| **E1.2** Supabase clients | **Done.** Five → three under `lib/db/`, `server-only` guard on admin. |
| **E1.3** RLS/idiom audit | **Done.** Silent-empty direction clear; all 9 tables exposed to `anon` are closed. No table in the database still grants `public`/`anon` unrestricted ALL/UPDATE/DELETE. |
| **E1.4** data-access rule | **Done.** `lib/db/README.md`, summarised in `CLAUDE.md`. |
| **E2.1** retire duplicates | **Done.** 12 redirect stubs → `next.config.ts`; 22 + 27 dead files deleted. |
| **E2.2** one UI kit | **Done.** No `.jsx` under `components/ui/`. |
| **E2.3** one CSV/date/currency | **Done.** 10 CSV impls → `lib/csv.ts`; moment gone; `formatCurrency` in `lib/format.ts`. |
| **E3.1** feature layout | **Done.** `features/anatomy` is the exemplar. |
| **E3.2** migrate features | **5 done:** anatomy, facility-scout, bed-tracker, period, fitness. **35 files remain** in `hooks/supabase-calls/` (fitness took 7) — that directory emptying is the finish line. |
| **E3.3** kebab-case routes | **Not started.** Needs redirects. |
| **E3.4** split `lib/` | **Not started.** |
| **E4.1** god files | **Period done** (4,585 lines → 889 + 16 files) and now migrated into `features/period`. `ai/page.tsx` (1,236) next. |
| **E4.2** dialog store | **Not started.** `stores/dialog-store.ts`, 30 KB, global. |
| **E5.1** convert 55 `.js/.jsx` | **Not started.** Down from 79. |
| **E5.2** generated DB types | **Not started.** Every `schema/types.ts` is hand-written and can drift. |
| **E5.3** lint everything | **Not started.** `redesign/**` still excluded in `eslint.config.mjs`. |
| **E6.1** knip | **Configured**, first batches deleted. 41 unused files remain. |
| **E6.2** prune deps | **Partial.** moment, crypto-js, @sendgrid/mail removed. 120 runtime deps. |
| **E6.3** seed data out of tree | **Not started.** `constants/liftmanual_all_workouts.json` is 4.1 MB. |
| **E7** documentation | **Partial.** `CLAUDE.md`, three feature READMEs, `knip.README.md`, this file. |
| **E8** mobile contract | **Done.** 31 routes / 45 RPCs / 38 tables, all verified live. The verb check now follows re-exports. |
| **E9** extract the blueprint | **Not started.** |

---

## Do next, in order

### 1. Empty `hooks/supabase-calls/` — 35 files left

The five big features are migrated. What remains in that directory is the
long tail: whichever feature each hook belongs to, moved the same way. E3.2 is
done when it is empty.

`useFitnessContentSchedule` is the worked example of how to do one where the
table is also RLS-exposed: move the read behind an API route **first**, verify
the route serves against a real session, and only then drop the policy. Doing
it in the other order blanks the feature silently. See
`features/fitness/api/content-schedule.ts`.

### 2. E1.3 — swept and fixed 5 Sept 2026; one table still open

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

| Table | Readable as anon |
| --- | --- |
| `admin_sessions` | **701 rows** — `session_token`, `ip_address`, `user_agent`, `location`, all `is_active` |
| the other eight | 0 rows — because they are *empty*, not protected |

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

⚠️ **The 701 `admin_sessions` tokens are still live.** They were readable for
as long as the policy existed, so they should be treated as disclosed and the
sessions ended. That is an application action, not a migration, and has **not**
been done.

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

### 3. E4.1 continued — `ai/page.tsx` (1,236 lines), then `stores/dialog-store.ts`

Use the Period method: **capture a per-endpoint or per-tab baseline first**,
split, then diff against it. That is what made a 1,166-line extraction safe to
claim.

---

## Pending items — deferred, not forgotten

Logged here because they were raised mid-task and consciously postponed.

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
   *"Email address is not verified"* — which looks like a verification problem
   rather than a region one. Check the region first.
2. **A new SES account is sandboxed** until AWS grants production access, and
   can only send to verified addresses.

Until it is set, `missingEmailConfig()` names the absent variable and the
device-OTP route refuses **before** issuing a code — issuing one it cannot
deliver would burn the 60-second resend cooldown.

**Affected:** admin invites, admin login alerts, device sign-in OTP.

### Four messaging providers, should be two

| Channel | Live | Also present |
| --- | --- | --- |
| SMS | `lib/sms.ts` — AWS End User Messaging | `lib/twilio.ts` (one file imports **both**) |
| Email | `lib/email.ts` — AWS SES | `resend` in `app/api/support/route.js` |

Decide and delete the losers.

### Smaller, still open

- **`redesign/**` is excluded from eslint** and ignored by knip. Its fate is a
  decision nobody has made; `PageHeader` (36 importers) and `KpiCard` (52) are
  very much alive inside it, so it is not simply dead.
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
  `command -v rg`, which succeeds when a shell defines `rg` as a *function*
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

### A cross-feature import can hide behind an absolute path

The migration guidance says to grep a moved feature's `ui/` for
`from "../page"`. Fitness had none — and still had the same class of problem,
one level up. The Map feature imported a picker from
`@/app/(dashboard)/fitness/_components/user-search-select`: an absolute
specifier into another feature's private `_components` directory, which no
relative-import sweep sees and which `tsc` only complains about *after* the
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

| Migration | What |
| --- | --- |
| `20260905_contract_rpc_signatures_reader.sql` | read-only `pg_proc` reader for the contract test |
| `20260905_fix_pgcrypto_search_path.sql` | qualified `extensions.gen_random_bytes` in `issue_canary` and `start_admin_session` |
| `20260905_reapply_epic21_delete_account_vocabulary.sql` | re-applied a migration that never landed |
| `20260905_device_sign_in_otp_functions.sql` | wrote the two missing OTP functions, and adds `otp_issued_at` |
| `20260905_e13_revoke_public_admin_table_access.sql` | E1.3: dropped 8 `admin_full_access_*` policies that were `TO public USING (true)`, revoked the matching anon/authenticated grants, restored `SELECT` for the one correctly scoped policy that depended on it |
| `20260905_e13_close_fitness_content_schedule.sql` | E1.3: the ninth, after its browser read moved to `/api/fitness/content-schedule` |

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
