# IBP Businesses

Independent Business Providers: registration, approval lifecycle, premium tiers and their product catalogue.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/ibp/
  ui/       10 files — components
  api/      7 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   1 files — shapes ui/ and api/ share
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/ibp` | GET, POST | `api/list.ts` |
| `/api/ibp/[id]` | PATCH, DELETE | `api/detail.ts` |
| `/api/ibp/[id]/activity` | GET | `api/detail-activity.ts` |
| `/api/ibp/[id]/products` | GET, POST | `api/detail-products.ts` |
| `/api/ibp/overview` | GET | `api/overview.ts` |
| `/api/ibp/products` | GET, PATCH | `api/products.ts` |
| `/api/ibp/products/bulk` | POST | `api/products-bulk.ts` |

Permissions: `ibp.delete`, `ibp.edit`, `ibp.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `get_ibp_kpi_stats`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
