# FAQ

Public FAQ entries and their categories.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/faq/
  ui/       5 files — components
  api/      (empty)
  data/     1 files — hooks and queries
  schema/   1 files — shapes ui/ and api/ share
```

## Routes

No API routes — this feature reads and writes through its `data/` hooks.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

## Data access

`data/*` uses the browser client, so **RLS applies**. A table with RLS on and
no policy for `authenticated` returns an empty set without erroring — see
`lib/db/README.md` before adding a read here.
