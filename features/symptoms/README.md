# Symptoms

The symptom catalogue: entries, their categories, body-part links, the home
carousel slots, and the analytics tab.

Sixth feature migrated under E3.2. `features/anatomy` is the exemplar.

## Layout

```
features/symptoms/
  ui/       SymptomsPage (tab shell) + add/view dialogs + 3 tabs
  api/      2 route handlers
  data/     useSymptoms.ts (react-query)
  schema/   types.ts — the zod shape and the Input/Output types
```

## Routes

Both URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/symptoms/analytics` | GET | `api/analytics.ts` | `symptoms.view` |
| `/api/symptoms/[id]/feature` | PUT, DELETE | `api/feature.ts` | `symptoms.feature` |

Page: `/symptoms` → `ui/SymptomsPage`.

**`[id]/feature` exports PUT and DELETE, not POST.** Worth stating because the
re-export has to name them exactly — guessing POST compiled fine as a handler
and failed only at the re-export, which is the cheap version of this mistake.

## Mobile contract

Neither route is contracted, and none of the four RPCs this feature calls
(`get_symptom_analytics`, `update_symptom_complex`, `get_body_part_stats`,
`log_admin_activity`) is either — all admin-side, all verified to exist.

**The tables are contracted, though.** `symptoms` and `symptom_categories` are
read directly by the Expo app through PostgREST, and
`increment_symptom_view_count` is a contracted RPC. So the admin writes here
land in a shape mobile depends on: `update_symptom_complex` takes the whole
payload as `jsonb`, which means a column rename shows up as missing data on
phones rather than as an error anywhere. Additive changes only.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`.
`data/useSymptoms.ts` uses the cookie-backed browser client and `apiFetch` for
the routes above. Neither touches the deprecated `@/lib/supabase*` shims.

## Things that will surprise you

- **There are two different `symptomsSchema` in this repo.** This feature's is
  `schema/types.ts` (an alias of `symptomSchema`); the other is in
  `schemas/conditions.schema.ts`, derived from `conditionsSchema` via
  `.omit({ symptoms: true })`, and belongs to Diseases. They also each export a
  `TSymptomsInput`. Searching by name finds the wrong one about half the time —
  search for the import specifier.
- **`stores/dialog-store.ts` imports this feature's type**, as
  `TSymptomsOutput as TConditionsOutput`. That alias is load-bearing nowhere:
  `TSymptomsOutput` is declared `any`, so it carries no type safety at all.
  The global dialog store reaching into a feature is the coupling E4.2 exists
  to remove.
- **`symptomSchema` is exported but nothing imports it by that name** — callers
  use the `symptomsSchema` alias beside it. knip flags the export, correctly;
  the const itself is used one line below. Left alone as pre-existing.
