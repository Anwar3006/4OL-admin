@AGENTS.md

# 4 Our Life — admin dashboard

Next.js admin panel for a Ghanaian healthcare platform. A companion Expo app
(`../4-Our-Life-App`) shares this Supabase database. Postgres lives in
`eu-west-1`; users are in Ghana, so every round trip costs ~100–160 ms before
the database does any work — payload size matters more than query time.

This codebase is being cleaned up to serve as the blueprint for several more
products. **Read `docs/cleanup-handoff.md` before making structural changes.**

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

**When you write that check, remember `public` is every role, not "logged-in
users".** A policy `TO public` does cover `authenticated` — a check that looks
only for the literal role name reports tables as locked when they are not, and
stays silent about the ones exposed to `anon`. The E1.3 sweep found nine of
those; see `docs/cleanup-handoff.md`.

`@/lib/supabase*` are deprecated shims. Do not add new imports of them. Note
that `lib/supabase.ts` exports two clients that **do not share a session** —
see its file comment before touching any caller.

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

Migrated: `anatomy` (the exemplar), `facility-scout`, `bed-tracker`,
`period`, `fitness`, `symptoms`, `healthy-living`, `facilities`,
`medication-reminder`, `marketing`, `chat`. E3.2 is finished when
`hooks/supabase-calls/` is empty — **22 files left**, down from 42.

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

`pnpm build` is not optional after a structural change. Typecheck does not
catch a broken route-group layout, a client component importing server-only
code, or a bad dynamic import.

## Known sharp edges

- **55 `.js`/`.jsx` files under `app/` are never type-checked.** `tsconfig`
  sets `strict: true` but also `checkJs: false`, and `include` lists only
  `.ts`/`.tsx`. Two of them are mobile-contract routes. This is why
  `pnpm build` catches things `pnpm type-check` cannot — a module deleted out
  from under one of these fails only at build.
- **`eslint.config.mjs` excludes `redesign/**`** entirely.
- **`stores/dialog-store.ts` (30 KB) is global.** Every feature's dialogs reach
  into it; it is the tightest coupling in the repo.
- **`constants/liftmanual_all_workouts.json` is 4.1 MB.** The build needs a
  4 GB heap because of files like it.
- **Email does not send.** `lib/email.ts` is wired to AWS SES but no AWS
  credentials or `SES_FROM_EMAIL` are set — admin invites, login alerts and the
  device sign-in OTP are all affected. See the pending-items section of
  `docs/cleanup-handoff.md`.
