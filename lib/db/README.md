# Database access

There is exactly one way to reach Postgres from each place code can run.
Pick by **where your code executes**, not by what it is doing.

| You are writing…                                  | Use                              | Runs as        | RLS |
| ------------------------------------------------- | -------------------------------- | -------------- | --- |
| A Client Component / hook (`"use client"`)        | `getBrowserClient()`             | the signed-in admin | enforced |
| A Server Component or Server Action               | `getServerClient()`              | the signed-in admin | enforced |
| An API route under `app/api/**`                   | `getAdminClient()`               | service role   | **bypassed** |

## The rule

**If the table has RLS enabled and no policy for `authenticated`, the browser
and server clients cannot see it.** They will not throw — PostgREST returns an
empty result set, so the feature renders "no data yet" and looks fine.

This has already cost this codebase three features:

- `healthy_living_body_parts` — RLS on, zero policies. The Healthy Tips admin
  tab had never once been able to save a link, and the Body Map detail panel
  reported "None linked" for every body part.
- `fitness_body_parts` — RLS on, read-only policy for `authenticated`. Writes
  from the browser client were silently rejected.
- `drug_body_parts` — same shape.

All three are now reached through service-role API routes
(`/api/anatomy/tip-links`, `/api/anatomy/exercise-links`,
`/api/anatomy/drug-links`).

So: **anything an admin writes, and anything on an RLS-locked table, goes
through an API route using `getAdminClient()`.** Reads of tables with a
sensible `authenticated` policy can go direct from the browser.

## Before you use `getAdminClient()`

It bypasses every row-level security policy in the database. Two obligations,
no exceptions:

1. It may only be imported from `app/api/**`. The module throws if it is
   evaluated in a browser bundle, but that is a backstop, not permission.
2. The route must authorise the caller first — `requireAdminApiUser(permission)`
   from `@/lib/admin-api-auth` — before it touches any data.

## Checking whether a table is reachable from the browser

```sql
select c.relname,
       c.relrowsecurity as rls_on,
       count(p.policyname) filter (where p.cmd in ('SELECT','ALL')) as read_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
where n.nspname = 'public' and c.relkind = 'r'
group by 1, 2
having c.relrowsecurity and count(p.policyname) = 0
order by 1;
```

Anything this returns is invisible to `getBrowserClient()` and
`getServerClient()`. It needs an API route.

## Mobile

The Expo app talks to this database directly through its own Supabase client
under RLS — 34 tables and 28 RPCs — plus 13 API routes in this repo. Changing
an RLS policy is therefore a mobile change. See `docs/mobile-contract.md`.

---

## Generated types (E5.2)

`database.types.ts` is the live `public` schema, generated from the Supabase
project. Regenerate it with:

```bash
pnpm gen:types      # supabase gen types typescript --project-id … 
```

It is the answer to "is this column real?". The Marketing Subscribers tab
returned a 500 for months because it selected `user_profiles(…, email, …)` and
that column does not exist — email lives in `auth.users`. These types catch
that at compile time:

```ts
type UserRow = Database["public"]["Tables"]["user_profiles"]["Row"];
const x: UserRow["email"] = "…";
// Property 'email' does not exist on type '{ admin_permissions: Json; … }'
```

### The clients are NOT globally typed, and that is deliberate

The obvious move is `createClient<Database>(…)` in `admin.ts`, `browser.ts` and
`server.ts`. **Do not** — it was tried and measured. `Database` is ~15,100
lines, and instantiating it across every call site in the app takes `tsc` past
2 GB and **crashes it after roughly three minutes**:

```
FATAL ERROR: Ineffective mark-compacts near heap limit
JavaScript heap out of memory
```

The file merely *existing* costs nothing — typecheck stays at ~7 seconds. It is
the generic across ~700 call sites that does not fit. Raising the heap would
trade a fast check for a slow, fragile one on every CI run, right after E6.3
got the build heap down from 4 GB to 2 GB.

**So use them per-module, where the payoff is worth it:**

```ts
import type { Database } from "@/lib/db/database.types";
type Row = Database["public"]["Tables"]["facility_profile"]["Row"];
```

That is also how to check a hand-written `schema/types.ts` against reality:
derive from `Database` and let the compiler tell you where the two disagree.
Those hand-written files were not rewritten wholesale — each one is a
narrower, UI-shaped view of a row, and replacing them mechanically would lose
that. They are now checkable, which is what E5.2 was for.
