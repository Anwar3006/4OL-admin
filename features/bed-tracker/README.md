# Bed Tracker

Live hospital bed availability, ward capacity, and ambulance dispatch routing.

Third feature migrated under E3.2, following `features/anatomy`. See that
README for the rationale behind the layout.

## Layout

```
features/bed-tracker/
  ui/       BedTrackerPage (tab shell) + 6 tabs + 2 dialogs
  api/      7 route handlers, one module per endpoint
  data/     useBedTracker.ts (react-query)
  schema/   types.ts — the 3 shapes ui/ and api/ share
```

The directory is `bed-tracker`; the route is `/bedtracker`. Feature
directories are kebab-case and need not match the URL — only `app/` is a URL.
Renaming the route needs a redirect and is E3.3.

## Routes

All seven URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/bedtracker` | GET | `api/overview.ts` |
| `/api/bedtracker/facilities` | POST | `api/facilities.ts` |
| `/api/bedtracker/facilities/[id]` | PATCH | `api/facilities-detail.ts` |
| `/api/bedtracker/wards/[id]` | PATCH | `api/wards-detail.ts` |
| `/api/bedtracker/alerts/[id]` | PATCH | `api/alerts-detail.ts` |
| `/api/bedtracker/dispatches` | POST | `api/dispatches.ts` |
| `/api/bedtracker/route-suggestions` | GET | `api/route-suggestions.ts` |

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`;
`data/useBedTracker.ts` uses `getBrowserClient()`. Neither touches the
deprecated `@/lib/supabase*` shims. See `lib/db/README.md`.

## Mobile contract

None of these routes is in `tests/contract/mobile-contract.ts`. Free to change
shape.

## Things that will surprise you

- **`ambulance_dispatches` has two foreign keys to `facility_profile`** —
  `destination_facility_id` and `rerouted_from_facility_id`. An unqualified
  PostgREST embed does not pick one; it fails the whole query and 500s the
  page. `api/overview.ts` names
  `ambulance_dispatches_destination_facility_id_fkey` explicitly. This was a
  live 500 until September 2026 — the page rendered its shell and no data.
- **`BedTrackerTabProps` used to live in the page component** and all six tabs
  imported it from `../page`. It is in `schema/types.ts` now.
- **`/api/bedtracker/route-suggestions` is a real endpoint**, not a stray
  `route.ts`. The directory name is part of the URL.
