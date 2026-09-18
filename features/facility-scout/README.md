# Facility Scout

Field data collection: scouts submit facilities from the field, admins review,
assign, register or reject them, and disburse rewards.

Second feature migrated under E3.2, following the shape set by
`features/anatomy`. See that README for the rationale behind the layout.

## Layout

```
features/facility-scout/
  ui/       FacilityScoutPage (tab shell) + 5 tabs + assign-dialog
  api/      6 route handlers, one module per endpoint
  data/     useFacilityScout.ts (react-query)
  schema/   types.ts — the 4 shapes ui/ and api/ share
```

## Directory name vs URL

This directory is `facility-scout`; the route is still `/facilityscout`.

**Feature directories are kebab-case and do not have to match the URL
segment.** They are not URLs — only `app/` is. Renaming the route to
`/facility-scout` needs a redirect for anyone who bookmarked it, and that is
E3.3's job. Doing it here would mix a URL change into a file move.

## Routes

All six URLs are unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/facilityscout` | GET | `api/overview.ts` |
| `/api/facilityscout/config` | GET PATCH | `api/config.ts` |
| `/api/facilityscout/submissions/[id]/assign` | POST | `api/submissions-assign.ts` |
| `/api/facilityscout/submissions/[id]/register` | POST | `api/submissions-register.ts` |
| `/api/facilityscout/submissions/[id]/reject` | POST | `api/submissions-reject.ts` |
| `/api/facilityscout/rewards/[id]/disburse` | POST | `api/rewards-disburse.ts` |
| `/api/facilityscout/submissions/upload-url` | GET | `api/upload-url.ts` |

Dynamic segments work exactly as before: the `[id]` folder stays in `app/`,
and the handler still receives its `params`. Only the file the route points at
moved.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`;
`data/useFacilityScout.ts` uses `getBrowserClient()`. Neither touches the
deprecated `@/lib/supabase*` shims. See `lib/db/README.md`.

## Mobile contract

`GET /api/facilityscout/submissions/upload-url` is in
`tests/contract/mobile-contract.ts` as of September 2026 — the Expo app's
Facility Scout submission flow (`hooks/use-facility-scout.ts`) depends on it
to mint a signed photo-upload URL. Changes to it must be additive per that
file's rule. The other six routes remain admin-console-only and free to
change shape.

Mobile does **not** go through an API route to create a submission — it
writes `facility_scout_submissions` rows directly via the RLS-enforced
client, the same pattern `facility_reviews` uses. Two RLS policies
(`create own scout submission`, `own scout submission or admin`) and a third
on `facility_scout_config` (`read scout config`) were added in
`supabase/migrations/20260909_facility_scout_mobile_ingestion.sql` — both
tables had RLS **on** with **zero** policies before that, the exact
no-policy-means-empty-or-blocked failure mode this file's parent CLAUDE.md
warns about. A mobile insert only ever sets `submitted_by`, `facility_name`,
`facility_type`, `gps_location`, `photos`, `region` — every other column
(`status`, `match_status`, `reviewed_*`, `assigned_collector_id`, ...) is a
DB default or admin-only, and there is deliberately no `UPDATE`/`DELETE`
policy for `authenticated` on this table.

## Things that will surprise you

- **`registrars` has two foreign keys to `user_profiles`** — `user_id`
  and `supervisor_id`. An unqualified PostgREST embed does not pick one, it
  fails the whole query and 500s the page. Both embeds here name
  `registrars_user_id_fkey` explicitly. (`registrars` was `data_collectors`
  until 2026-09-18, when it was consolidated with the Map feature's
  `map_collectors` into the single table backing the `registrar` role — see
  CLAUDE.md and `supabase/migrations/20260918_consolidate_registrar_collector_tables.sql`.)
- **So does `facility_scout_submissions`** — `submitted_by` and `reviewed_by`.
  `api/overview.ts` wants `submitted_by`.
- Both of those were live 500s until September 2026; the page rendered its
  shell and no data.
- **`FacilityScoutTabProps` used to live in the page component** and all five
  tabs imported it from `../page`. It is in `schema/types.ts` now. If you add
  a tab, take its props from there.
- **Assign is also the bulk endpoint.** `POST …/submissions/[id]/assign` with
  `{ ids: [...] }` in the body assigns many and ignores the path `id`.

## Route naming (E3.3)

The page is **`/facility-scout`**. It was `/facilityscout` until E3.3; the old spelling
redirects from `next.config.ts` and the smoke sweep asserts it.

**The API prefix is still `/api/facilityscout`** and was deliberately left alone. No mobile
route depends on it, but it is a URL contract for the admin app and renaming it
was outside what E3.3 asked for. So page and API spellings differ here — that
is intentional, not an oversight.
