# Jobs

Job listings, the approval queue, applicants and digital CVs.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/jobs/
  ui/       2 files — components
  api/      9 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/jobs` | GET, POST | `api/list.ts` |
| `/api/jobs/[id]` | PATCH | `api/detail.ts` |
| `/api/jobs/[id]/review` | PATCH | `api/review.ts` |
| `/api/jobs/applicants` | GET | `api/applicants.ts` |
| `/api/jobs/applications/[id]` | PATCH | `api/application-detail.ts` |
| `/api/jobs/attachment` **(mobile contract)** | GET | `api/attachment.ts` |
| `/api/jobs/bulk` | POST | `api/bulk.ts` |
| `/api/jobs/cvs` | GET | `api/cvs.ts` |
| `/api/jobs/export` | GET | `api/export.ts` |

Permissions: `jobs.manage`, `jobs.view`.

## Mobile contract

**1 route(s) here are frozen for mobile** — see the table above and
`tests/contract/mobile-contract.ts`. Never drop a field, rename the route or
reorder a parameter without shipping a mobile release first.

RPCs called (all admin-only and uncontracted): `log_admin_activity`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.

## Things that will surprise you

- **`/api/jobs/attachment` is mobile contract** (GET), called by the Expo app's
  `app/(app)/(auth)/Jobs/apply/[id].tsx`. It delegates to no RPC, so the trap
  the chat migration hit does not apply here.
