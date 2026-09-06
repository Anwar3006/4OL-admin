# Admins

Admin accounts, invitations, roles and permissions, activity logs and the security centre tab.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/admins/
  ui/       11 files — components
  api/      (empty)
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

No API routes — this feature reads and writes through its `data/` hooks.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

## Data access

`data/*` uses the browser client, so **RLS applies**. A table with RLS on and
no policy for `authenticated` returns an empty set without erroring — see
`lib/db/README.md` before adding a read here.

## Things that will surprise you

- **Four dead components were deleted with this migration**, each proven on
  three signals: no import specifier, flagged by knip, and absent from every
  real build artifact (`.tsbuildinfo` excluded — it lists what `tsc` read, not
  what shipped). They were `RolesMatrix`, `AdminSection.jsx`,
  `view-admin-dialog` and the two files under `_deprecated/`.
- **`app/api/admin/*` is not all this feature.** Session, profile, RBAC, search
  and security routes are infrastructure and stay in `app/`.
