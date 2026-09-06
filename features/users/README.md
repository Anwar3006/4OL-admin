# Users

End-user accounts: registry, flags, premium plans, invitations and bulk actions.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/users/
  ui/       12 files — components
  api/      6 files — route handlers, one module per endpoint
  data/     2 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/admin/users` | GET, PATCH | `api/list.ts` |
| `/api/admin/users/[id]/plan` | PATCH | `api/plan.ts` |
| `/api/admin/users/export` | GET | `api/export.ts` |
| `/api/admin/users/flag` | GET, POST | `api/flag.ts` |
| `/api/admin/users/invite` | POST | `api/invite.ts` |
| `/api/admin/users/kpis` | GET | `api/kpis.ts` |

Permissions: `users.edit`, `users.export`, `users.view`.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `auth_user_exists_by_email`, `create_profile_flag`, `get_registrar_trails`, `get_user_kpi_stats`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.

## Things that will surprise you

- **`view-user-dialog` had a `.jsx` twin.** `UsersPage` imports it
  extensionless, so both resolved ambiguously and knip reported the live
  `.tsx` as unused — its documented blind spot. The `.jsx` was proven dead
  (absent from every build artifact) and deleted, which removes the ambiguity.
- **`data/useUser.ts` is imported by five other features** (admins, tasks,
  chat, plus `components/UserSearchSelect`). It is the most-imported hook in
  the repo; treat its shape as shared.
