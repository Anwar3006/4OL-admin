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

Dynamic segments work exactly as before: the `[id]` folder stays in `app/`,
and the handler still receives its `params`. Only the file the route points at
moved.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`;
`data/useFacilityScout.ts` uses `getBrowserClient()`. Neither touches the
deprecated `@/lib/supabase*` shims. See `lib/db/README.md`.

## Mobile contract

None of these routes is in `tests/contract/mobile-contract.ts` — the Expo app
does not call Facility Scout. Free to change shape.

## Things that will surprise you

- **`data_collectors` has two foreign keys to `user_profiles`** — `user_id`
  and `supervisor_id`. An unqualified PostgREST embed does not pick one, it
  fails the whole query and 500s the page. Both embeds here name
  `data_collectors_user_id_fkey` explicitly.
- **So does `facility_scout_submissions`** — `submitted_by` and `reviewed_by`.
  `api/overview.ts` wants `submitted_by`.
- Both of those were live 500s until September 2026; the page rendered its
  shell and no data.
- **`FacilityScoutTabProps` used to live in the page component** and all five
  tabs imported it from `../page`. It is in `schema/types.ts` now. If you add
  a tab, take its props from there.
- **Assign is also the bulk endpoint.** `POST …/submissions/[id]/assign` with
  `{ ids: [...] }` in the body assigns many and ignores the path `id`.
