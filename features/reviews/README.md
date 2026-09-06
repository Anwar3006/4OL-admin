# Reviews & Ratings

Facility reviews and in-app store reviews, with moderation.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/reviews/
  ui/       5 files — components
  api/      (empty)
  data/     2 files — hooks and queries
  schema/   (empty)
```

## Routes

No API routes — this feature reads and writes through its `data/` hooks.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `facility_profile`, `facility_reviews`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `admin_moderate_app_review`, `admin_perform_facility_review_action`, `get_app_review_kpi_stats`, `get_review_kpi_stats`.

## Data access

`data/*` uses the browser client, so **RLS applies**. A table with RLS on and
no policy for `authenticated` returns an empty set without erroring — see
`lib/db/README.md` before adding a read here.

## Things that will surprise you

- **`/view-reviews` is a different, orphaned page** that reads
  `facility_ratings` — a table that does not exist. It is not part of this
  feature and is still broken; see `docs/cleanup-handoff.md`.
