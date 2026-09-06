# Map & Coverage

The facility map, coverage analysis, GPS collectors and their footprints.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/map/
  ui/       7 files — components
  api/      6 files — route handlers, one module per endpoint
  data/     2 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/map/collectors` | GET, POST | `api/collectors.ts` |
| `/api/map/collectors/[id]` | PATCH, DELETE | `api/collectors-detail.ts` |
| `/api/map/coverage` | GET, POST | `api/coverage.ts` |
| `/api/map/export` | GET | `api/export.ts` |
| `/api/map/footprints` | GET | `api/footprints.ts` |
| `/api/map/stats` | GET | `api/stats.ts` |

Permissions: `facilities.view`, `map.export`, `users.edit`, `users.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `facility_profile`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `log_admin_activity`.

**Contracted RPCs called:** `get_outdoor_route_pins`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.

## Things that will surprise you

- **`api/coverage.ts` and `api/stats.ts` share `data/map-coverage.ts`**, which
  moved out of `lib/` with the feature.
- **`ui/GoogleMapContainer.jsx` is still `.jsx`** and therefore never
  type-checked. Converting it is E5.1.
