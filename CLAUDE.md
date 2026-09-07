@AGENTS.md

# 4 Our Life — admin dashboard

Next.js admin panel for a Ghanaian healthcare platform. A companion Expo app
(`../4-Our-Life-App`) shares this Supabase database. Postgres lives in
`eu-west-1`; users are in Ghana, so every round trip costs ~100–160 ms before
the database does any work — payload size matters more than query time.

This codebase serves as the blueprint for several companion products. **Read `docs/ARCHITECTURE_BLUEPRINT.md` and `docs/cleanup-handoff.md` before making structural changes.**

---

## Four rules that are not style preferences

### 1. Pick the database client by where your code runs

| Writing… | Use | RLS |
| --- | --- | --- |
| Client Component / hook | `getBrowserClient()` — `@/lib/db/browser` | enforced |
| Server Component / Action | `getServerClient()` — `@/lib/db/server` | enforced |
| API route under `app/api/**` | `getAdminClient()` — `@/lib/db/admin` | **bypassed** |

**If a table has RLS on and no policy for `authenticated`, the browser and
server clients see nothing — and do not throw.** PostgREST returns an empty
result set, so the feature renders "no data yet" and looks fine. This has
already shipped three broken features (`healthy_living_body_parts`,
`fitness_body_parts`, `drug_body_parts`). Anything an admin *writes*, and
anything on an RLS-locked table, goes through an API route with
`getAdminClient()` — after `requireAdminApiUser(permission)`.

Full reasoning and the SQL to check a table: `lib/db/README.md`.

**Check a column against `lib/db/database.types.ts` before writing a query.**
It is generated from the live schema (`pnpm gen:types`) and is the answer to
"is this column real?" — an unknown column does not degrade, it fails the
whole PostgREST request, which is how the Marketing Subscribers tab 500'd for
months on a `user_profiles.email` that does not exist. Use it per-module;
do **not** type the shared clients with `<Database>` — that crashes `tsc`.

**When you write that check, remember `public` is every role, not "logged-in
users".** A policy `TO public` does cover `authenticated` — a check that looks
only for the literal role name reports tables as locked when they are not, and
stays silent about the ones exposed to `anon`. The E1.3 sweep found nine of
those; see `docs/cleanup-handoff.md`.

`lib/supabase-admin.ts`, `-browser.ts` and `-server.ts` are **gone** — they
were one-line renamed re-exports, so their 129 callers moved to `lib/db/*`
mechanically.

**`lib/supabase.ts` remains, and it is the anon client.** Its session lives in
localStorage, not the cookies sign-in writes to, so a caller queries as `anon`
and an RLS-protected table comes back EMPTY rather than erroring. Two callers
are left — `features/medication-reminder/ui/MedicationStats.tsx` and
`components/editor/plugins/drag-drop-paste-plugin.tsx` — and moving them is a
real behaviour change that must be checked against the database per call site,
not swept.

There is one deliberate exception to the table above:
`lib/db/isolated-auth.ts`, whose session is intentionally NOT the app's. It
exists for the public `/delete-account` page, which signs a user in and out
without disturbing the admin signed into the same browser. One caller, and it
should stay that way — it is `anon` until something signs in on it, so reads
through it come back empty rather than erroring.

It replaced `app/utils/supabaseClient.js`, an undocumented fourth client that
survived E1.2 because it was a `.js` file and had drifted six importers, two of
them reading tables that do not exist. See `docs/cleanup-handoff.md`.

### 2. Changes to the mobile contract must be additive

**31 API routes, 48 RPCs and 38 tables** are consumed by the Expo app. Old
builds live on phones for months. Never drop a field, rename a route, reorder an RPC
parameter, or tighten an RLS policy on a listed table without shipping a
mobile release first. New parameters get defaults.

The manifest is `tests/contract/mobile-contract.ts`; it is a cache, not the
source of truth. **Regenerate before any release that touches these:**

```bash
bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
```

**It has been wrong twice.** Pass 1 covered `hooks/` and `services/` only and
missed the device sign-in flow. Pass 2 was hand-built at 16 routes and missed
**fifteen** more — the whole chat surface, all four Period Tracker routes, the
OTP pair. The regeneration script existed to prevent that and could not run:
it gated on `command -v rg`, which succeeds when a shell defines `rg` as a
function and then fails inside its own subshell.

Also: **a contracted route can delegate to an RPC that is not contracted**, and
that RPC is then free to vanish. `/api/auth/device-sign-in/send-otp` did, and
the function it calls did not exist. List the RPC too. `submit_period_trivia`
was the same gap, found during the `features/period` migration; the
`features/chat` migration found **three more at once**
(`dispatch_notification`, `fn_mark_conversation_read`,
`fn_create_group_conversation`). All four are listed now. **Check this every
time you migrate a feature that owns a contracted route.**

A route file that is a **re-export** (`export { GET } from "@/features/…"`)
still satisfies the contract: `tests/contract/api-routes.test.ts` follows the
specifier and reads the verbs from the module that defines them. It does not
merely match the names in the re-export line — a re-export naming a verb the
handler never defines still fails.

Details: `docs/mobile-contract.md`.

### 3. Delete on evidence, never on reading

This tree has parallel modules that look dead and are not, and one file that
looked live and had never executed. Before deleting anything, prove it with
`pnpm knip`, the Playwright route sweep, or the build manifest — not by
grepping and judging. `docs/cleanup-handoff.md` lists what is proven and what
is not.

**Two proofs, not one.** Each tool has a blind spot, and they are not the
same blind spot:

- **grep is fooled by substrings.** `AdminDashboardShell` returns hits from
  `NewAdminDashboardShell`. Search for the import specifier, not the name.
- **knip is fooled by extensionless specifiers.** It reports
  `components/ui/button.tsx` as unused; it has 143 importers. A `Button.jsx`
  sibling makes `@/components/ui/button` ambiguous. See `knip.README.md`.
- **a route that builds is not a route anyone uses.** The build manifest
  proves existence, never reachability. Only the smoke sweep does that.

### 4. A feature lives in one directory

Proven on three features. Read `features/anatomy/README.md` — it is the
exemplar and explains the reasoning.

```
features/<name>/
  ui/       components
  api/      route handlers, one module per endpoint
  data/     hooks, queries, mutations
  schema/   the shapes and vocabularies both halves agree on
  README.md what it owns, its tables and RPCs, whether mobile depends on it
```

`app/` keeps one file per route that re-exports and holds no logic:

```ts
// app/api/anatomy/regions/route.ts
export { GET } from "@/features/anatomy/api/regions";
```

**The `app/` tree is a URL contract, not an organisational choice.** Next
derives routes from those directories, so a folder rename there is a URL
change. The re-export files are what let code be organised by feature while
URLs stay put.

Feature directories are **kebab-case and need not match the URL segment** —
`features/facility-scout` serves `/facilityscout`. Only `app/` is a URL.
Renaming the route is E3.3's job and needs a redirect.

`schema/` is the slot that earns its keep: it holds what `ui/` and `api/` must
agree on. **All three features moved so far** had a shared contract parked in
whichever file happened to declare it first — `BODY_SYSTEMS` inside a dialog, so the API
kept a hand-copied subset of five of nine and the Body Map filter 400'd for
months; `FacilityScoutTabProps` inside the page component, so all five tabs
imported from `../page` and broke the moment it was renamed.

**E3.2 is complete.** All 28 features live under `features/`, each with a
README, and `hooks/supabase-calls/` — the shared-hook dumping ground that held
42 files — no longer exists. `tests/unit/feature-layout.test.ts` fails if it
reappears or if a feature ships without a README.

A new hook goes in `features/<name>/data/`, beside the `ui/` and `api/` that
use it. Not in a shared hooks directory.

**Route segment config stays in `app/`.** Next reads `export const runtime`
by statically analysing the route file, so it does not follow a re-export.
Moving those lines into a feature module drops the config silently. See
`features/period/README.md`.

When you migrate one, grep its `ui/` for `from "../page"` — three features
had a shared type parked in the page component, because without a `schema/`
slot there is nowhere neutral to put one.

**Also grep for `from "@/app/`.** Fitness had no `../page` import and still
had the same problem one level up: the Map feature reached into
`@/app/(dashboard)/fitness/_components/user-search-select`. A relative-import
sweep does not see that; it is now `components/UserSearchSelect.tsx`.

---

## Commands

```bash
pnpm dev                # develop
pnpm type-check         # tsc
pnpm lint               # eslint
pnpm test               # vitest — unit + contract
pnpm test:contract      # mobile contract only
pnpm test:smoke         # Playwright route sweep (needs E2E_ADMIN_* env)
pnpm knip               # dead files, exports and deps — the evidence for rule 3
pnpm build              # production build — catches what tsc cannot
```

**Without Supabase credentials, `pnpm test` reports "123 passed, 1 skipped"
and looks green — the skipped test is the live RPC signature check, and
`pnpm test:smoke` cannot run at all.** Read "Working without Supabase access"
in `docs/cleanup-handoff.md` before picking up work in that state; it lists
which epics are still fully verifiable and which are not.

**CI needs three repository secrets** — `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without them CI
still passes; it just stops checking the RPC signatures. See `docs/ci.md`.

`pnpm build` is not optional after a structural change. Typecheck does not
catch a broken route-group layout, a client component importing server-only
code, or a bad dynamic import.

## Known sharp edges

- **The `.js`/`.jsx` blind spot is closed.** There are none left in app code
  (E5.1). `tsconfig` still sets `checkJs: false` with an `include` of only
  `.ts`/`.tsx`, so the hazard returns the moment someone adds one — and
  `pnpm build` remains the only net for files `tsc` does not see.

  Converting them found three live bugs nothing else could have: the email
  password-reset flow calling two functions that do not exist, a support email
  passing `reply_to` where Resend expects `replyTo` (silently dropped), and a
  details page initialising object state to `[]` so a failed query rendered
  blanks instead of an error.
- **`eslint.config.mjs` excludes `redesign/**`** entirely.
- **`stores/dialog-store.ts` holds the state; the hooks live with their
  features.** E4.2 split it 991 → 185 lines: one Zustand store still owns all
  dialog state (so `useCloseAllDialogs` and `useOpenDialogCount` still work
  across features), while each feature's per-dialog hooks sit in
  `features/<name>/data/dialog-hooks.ts`. A new dialog adds its type to
  `DialogTypes` in the store and its hook to the owning feature.
- **Seed JSON lives in `scripts/seed-data/`, not the app tree.** Nothing under
  `app/`, `features/` or `lib/` imports it, which is why the build heap is
  2048 MB rather than the 4096 it used to need.
- **Email does not send.** `lib/email.ts` is wired to AWS SES but no AWS
  credentials or `SES_FROM_EMAIL` are set — admin invites, login alerts and the
  device sign-in OTP are all affected. See the pending-items section of
  `docs/cleanup-handoff.md`.
