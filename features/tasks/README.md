# Task Manager

The admin Kanban task board.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/tasks/
  ui/       5 files — components
  api/      4 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/admin/tasks` | GET, POST | `api/list.ts` |
| `/api/admin/tasks/[id]` | PATCH, DELETE | `api/detail.ts` |
| `/api/admin/tasks/export` | GET | `api/export.ts` |
| `/api/admin/tasks/stats` | GET | `api/stats.ts` |

Permissions: `tasks.edit`, `tasks.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `get_admin_task_stats`, `log_admin_activity`, `update_admin_task_status`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
