# Reports

Scheduled reports: schedules, recipients, runs and the delivery inbox.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/reports/
  ui/       5 files — components
  api/      2 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/reports` | GET, POST | `api/reports.ts` |
| `/api/reports/cron` | GET | `api/cron.ts` |

Permissions: `reports.manage`, `reports.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

RPCs called (all admin-only and uncontracted): `enqueue_due_report_runs`, `next_report_run_at`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.
