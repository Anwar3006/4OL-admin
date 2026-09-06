# Healthy Living

The healthy-living tip catalogue: entries, categories, body-part links, the
home carousel slots, and the analytics tab. Structural twin of
`features/symptoms` — same two routes, same carousel mechanics.

Seventh feature migrated under E3.2. `features/anatomy` is the exemplar.

## Layout

```
features/healthy-living/
  ui/       HealthyLivingPage + add/view dialogs + stats + 2 tabs
  api/      2 route handlers
  data/     useHealthyLiving.ts (react-query)
  schema/   types.ts (the zod shape) and parents.json
```

## Routes

All three URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/healthy-living/analytics` | GET | `api/analytics.ts` | `healthyliving.view` |
| `/api/healthy-living/[id]/feature` | PUT, DELETE | `api/feature.ts` | `healthyliving.feature` |

Page: `/healthy_living` → `ui/HealthyLivingPage`.

⚠️ **The page URL uses an underscore and the API uses a hyphen** —
`/healthy_living` but `/api/healthy-living`. Both predate this migration, both
are a URL contract, and the mismatch is preserved deliberately. The directory
here is kebab-case like every other feature and matches neither; that is fine,
only `app/` is a URL. Renaming the page route is E3.3 and needs a redirect.

## Mobile contract

Neither route is contracted, and none of the three RPCs this feature calls
(`get_healthy_living_analytics`, `get_healthy_living_kpi_stats`,
`log_admin_activity`) is either — all admin-side, all verified to exist.

**The tables are contracted.** `healthy_living_info` and
`healthy_living_categories` are read directly by the Expo app, and
`increment_healthy_living_view_count` is a contracted RPC. Admin writes here
land in a shape mobile depends on: additive changes only.

Related and easy to trip over: **`healthy_living_body_parts` has RLS on with
no policy the browser client satisfies**, which is one of the three junctions
that shipped broken. Anything reading it goes through an API route — see
`features/anatomy/README.md` and `lib/db/README.md`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`.
`data/useHealthyLiving.ts` uses the browser client plus `apiFetch` for the
routes above. Neither touches the deprecated `@/lib/supabase*` shims.

## Things that will surprise you

- **`schema/parents.json` is referenced by nothing.** 85 lines of NHS-style
  category headings. A grep for the filename and for every plausible import
  form finds no importer — but that is **one** proof, and rule 3 wants two.
  knip cannot supply the second: it does not track `.json`. So it moved with
  the feature rather than being deleted. If you want it gone, the missing
  evidence is a build-manifest or bundle check, not another grep.
- **The carousel routes share `lib/carousel-slots.ts` with Symptoms.** It stays
  in `lib/` precisely because two features use it. Its feature path used to
  report `updated: N` by counting ids it looped over rather than rows affected,
  so featuring a deleted id claimed success — fixed with the Symptoms
  migration, and this route inherited the fix.
- **`HealthyLivingStats.tsx` is PascalCase while the dialogs are kebab-case.**
  Pre-existing inconsistency, carried across unchanged rather than folded into
  a move that was meant to be behaviour-free.
