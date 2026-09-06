# Facilities

The facility directory: profiles, approval status, featuring, the Top Rated
board, offerings, business hours, ratings and the CSV export.

Eighth feature migrated under E3.2, and the largest by file count. Distinct
from `features/facility-scout` (submissions and scout rewards) and
`features/bed-tracker` (ward capacity), which own their own routes.

## Layout

```
features/facilities/
  ui/       FacilitiesPage (tab shell), FacilityTypePage, 10 dialogs and
            sections, plus the table column and mobile-card configs.
  api/      10 route handlers, one module per endpoint.
  data/     useFacilities.ts + useFacilitiesApi.ts
  schema/   types.ts — the facility profile zod shape and BusinessDay
```

## Routes

All twelve URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler | Permission |
| --- | --- | --- | --- |
| `/api/facilities` | GET | `api/list.ts` | `facilities.view` |
| `/api/facilities/stats` | GET | `api/stats.ts` | `facilities.view` |
| `/api/facilities/options` | GET | `api/options.ts` | `facilities.view` |
| `/api/facilities/export` | GET | `api/export.ts` | `facilities.view` |
| `/api/facilities/featured` | GET | `api/featured.ts` | `facilities.view` |
| `/api/facilities/top-rated` | GET | `api/top-rated.ts` | `facilities.view` |
| `/api/facilities/[id]/featured` | PUT, PATCH | `api/featured-detail.ts` | `facilities.feature` |
| `/api/facilities/[id]/status` | PATCH | `api/status-detail.ts` | `facilities.approve` |
| `/api/facilities/[id]/top-rated` | PUT, DELETE | `api/top-rated-detail.ts` | `facilities.feature` |
| `/api/facility-metrics` | GET | `api/metrics.ts` | `facilities.view` |

Note `/api/facility-metrics` sits outside the `/api/facilities/` prefix. That
is pre-existing and is a URL contract; it is served from this feature anyway.

Pages: `/facilities` → `ui/FacilitiesPage`, `/facilities/[type]` →
`ui/FacilityTypePage`.

## ⚠️ Seventeen hollow routes shadow the real one

`app/(dashboard)/facilities/` still holds 17 hand-written `.jsx` pages —
`hospitals`, `dental`, `pharmacies`, `eye-care`, `homes`, `diagnostic-labs`,
`osteopathy`, `physiotherapy`, `prosthetics`, `health-school`, plus five
`*/create` pages and `add-facility`. **Every one renders an empty div.** Their
real component is commented out, and the directory those comments point at,
`components/redesign/auth/Facilities/`, does not exist — so they cannot be
restored by uncommenting.

They are not merely empty. **A static segment beats a dynamic one in Next**, so
`/facilities/hospitals` resolves to the hollow page instead of
`ui/FacilityTypePage`, which is a complete, working listing. Measured against a
running build with an admin session:

```
/facilities/hospitals      18,396 bytes   no search box, no type header
/facilities/pharmacy       21,962 bytes   renders "Pharmacy" + the search box
```

The three shadowed pages come back within six bytes of each other — the same
"identical bodies is the tell" signature as an expired smoke session.

Two things stop this being an emergency: **nothing in the app links to any
`/facilities/<type>` URL** — not the sidebar, not any component — so the whole
family is orphaned; and the static slugs do not match the database anyway
(`facility_type` is `dental_clinic`, `home`, `pharmacy`, while the pages are
`dental`, `homes`, `pharmacies`). Deleting the hollow pages would un-shadow
`[type]`, but `/facilities/hospitals` would then render an empty table for a
type that does not exist.

**So it is a route-retirement decision, not a migration fix**, and it was left
alone deliberately. It belongs with E3.3. See `docs/cleanup-handoff.md`.

## Mobile contract

None of the ten routes is contracted. `facility_profile` and `facility_reviews`
**are** contracted tables — the Expo app reads them directly — so admin writes
here land in a shape mobile depends on. Additive changes only.

`get_facilities_map` is a contracted RPC and is called from
`data/useFacilities.ts` (browser client, 11 parameters). `log_admin_activity`
and `get_facility_dashboard_metrics` are admin-only and uncontracted; both
verified to exist.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
ten handlers were all converted off the deprecated `@/lib/supabase-admin` shim.
`data/*` uses the browser client. `facility_profile` has eight policies
covering `authenticated`, and a `TO public` SELECT policy makes active
facilities world-readable by design.

## Things that will surprise you

- **`PUT /api/facilities/[id]/top-rated` answers `{"ok":true,"rank":N}` for an
  id that matches nothing.** Like the carousel routes did before their fix, it
  reports the rank it *computed* rather than what it wrote, and every handler
  here is `UPDATE … WHERE id = ?` with no insert. Not fixed as part of this
  move; the same shape as the `setCarouselSlots` bug fixed with Symptoms.
- **`FacilityTypePage` is still `.jsx`** and therefore never type-checked
  (`tsconfig` includes only `.ts`/`.tsx`). Converting it is E5.1.
- **Three different relative-import forms reached into this feature** and none
  was found by grepping for `@/`: `./useFacilities` from a sibling hook,
  `../schemas/facility-profile.schema` from `types/`, and
  `../facilities/_components/view-facility-dialog` from `medenquiry`. `tsc`
  caught all three. See the handoff.
