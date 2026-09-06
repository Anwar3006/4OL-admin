# Delete Account Requests

Account-deletion requests, their grace-period lifecycle and the retention policy settings.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/delete-account-requests/
  ui/       4 files — components
  api/      3 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/admin/delete-account-requests` | GET, POST | `api/list.ts` |
| `/api/admin/delete-account-requests/[id]` | PATCH | `api/detail.ts` |
| `/api/admin/delete-account-requests/export` | GET | `api/export.ts` |

Permissions: `deleteaccount.approve`, `deleteaccount.export`, `deleteaccount.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `get_delete_account_request_stats`, `log_admin_activity`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
