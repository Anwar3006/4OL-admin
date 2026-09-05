@AGENTS.md

# 4 Our Life — admin dashboard

Next.js admin panel for a Ghanaian healthcare platform. A companion Expo app
(`../4-Our-Life-App`) shares this Supabase database. Postgres lives in
`eu-west-1`; users are in Ghana, so every round trip costs ~100–160 ms before
the database does any work — payload size matters more than query time.

This codebase is being cleaned up to serve as the blueprint for several more
products. **Read `docs/cleanup-handoff.md` before making structural changes.**

---

## Three rules that are not style preferences

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

`@/lib/supabase*` are deprecated shims. Do not add new imports of them. Note
that `lib/supabase.ts` exports two clients that **do not share a session** —
see its file comment before touching any caller.

### 2. Changes to the mobile contract must be additive

16 API routes, 28 RPCs and 34 tables are consumed by the Expo app. Old builds
live on phones for months. Never drop a field, rename a route, reorder an RPC
parameter, or tighten an RLS policy on a listed table without shipping a
mobile release first. New parameters get defaults.

The manifest is `tests/contract/mobile-contract.ts`; it is a cache, not the
source of truth. **Regenerate before any release that touches these:**

```bash
bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
```

It was wrong once already — a pass over `hooks/` and `services/` alone missed
three routes called from `lib/` and `context/`, including the device sign-in
flow. Details: `docs/mobile-contract.md`.

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

- **79 `.js`/`.jsx` files under `app/` are never type-checked.** `tsconfig`
  sets `strict: true` but also `checkJs: false`, and `include` lists only
  `.ts`/`.tsx`. Two of them are mobile-contract routes.
- **`eslint.config.mjs` excludes `redesign/**`** entirely.
- **`stores/dialog-store.ts` (30 KB) is global.** Every feature's dialogs reach
  into it; it is the tightest coupling in the repo.
- **`constants/liftmanual_all_workouts.json` is 4.1 MB.** The build needs a
  4 GB heap because of files like it.
