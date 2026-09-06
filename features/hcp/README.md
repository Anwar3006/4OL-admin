# Healthcare Professionals

Healthcare professional onboarding, licence verification and the practitioner registry.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/hcp/
  ui/       2 files — components
  api/      5 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/hcp` | GET, POST | `api/list.ts` |
| `/api/hcp/[id]` | PATCH | `api/detail.ts` |
| `/api/hcp/[id]/verify` | PATCH | `api/verify.ts` |
| `/api/hcp/bulk` | POST | `api/bulk.ts` |
| `/api/hcp/export` | GET | `api/export.ts` |

Permissions: `hcp.create`, `hcp.verify`, `hcp.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `log_admin_activity`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
