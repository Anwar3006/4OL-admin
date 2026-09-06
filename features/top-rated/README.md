# Top Rated

The Top Rated board across modules.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/top-rated/
  ui/       4 files — components
  api/      (empty)
  data/     1 files — hooks and queries
  schema/   1 files — shapes ui/ and api/ share
```

## Routes

No API routes — this feature reads and writes through its `data/` hooks.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `top_rated_items`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `admin_remove_top_rated_item`, `admin_upsert_top_rated_item`, `search_top_rated_items`.

## Data access

`data/*` uses the browser client, so **RLS applies**. A table with RLS on and
no policy for `authenticated` returns an empty set without erroring — see
`lib/db/README.md` before adding a read here.
