# Diseases & Conditions

The conditions catalogue: entries, categories, body-part links, carousel slots, engagement and linkages.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/diseases/
  ui/       7 files — components
  api/      8 files — route handlers, one module per endpoint
  data/     2 files — hooks and queries
  schema/   1 files — shapes ui/ and api/ share
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/diseases` | GET, POST | `api/list.ts` |
| `/api/diseases/[id]` | GET, PATCH, DELETE | `api/detail.ts` |
| `/api/diseases/[id]/feature` | PUT, DELETE | `api/feature.ts` |
| `/api/diseases/[id]/status` | PATCH | `api/status.ts` |
| `/api/diseases/engagement` | GET | `api/engagement.ts` |
| `/api/diseases/export` | GET | `api/export.ts` |
| `/api/diseases/linkages` | GET | `api/linkages.ts` |
| `/api/diseases/stats` | GET | `api/stats.ts` |

Permissions: `diseases.create`, `diseases.delete`, `diseases.edit`, `diseases.export`, `diseases.feature`, `diseases.view`, `engagement.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `categories`, `condition_categories`, `conditions`, `fitness_exercises`, `healthy_living_info`, `symptoms`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `insert_condition`, `log_admin_activity`, `update_condition`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
