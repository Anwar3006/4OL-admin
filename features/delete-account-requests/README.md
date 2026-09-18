# Delete Account Requests

Account-deletion requests, their grace-period lifecycle, the retention
policy settings, legal holds and GDPR data export (Epic 3.4).

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/delete-account-requests/
  ui/       4 files — components
  api/      9 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   2 files — export-tables.ts (raw table list), pdf-report-categories.ts (PDF grouping)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/admin/delete-account-requests` | GET, POST | `api/list.ts` |
| `/api/admin/delete-account-requests/[id]` | PATCH | `api/detail.ts` |
| `/api/admin/delete-account-requests/export` | GET | `api/export.ts` |
| `/api/admin/delete-account-requests/legal-hold` | GET, POST, PATCH | `api/legal-hold.ts` |
| `/api/admin/delete-account-requests/export-request` | POST | `api/export-request.ts` |
| `/api/admin/delete-account-requests/export-download` | GET | `api/export-download.ts` |
| `/api/admin/delete-account-requests/export-pdf` | GET | `api/export-pdf.ts` |
| `/api/user/export-data` | POST | `api/self-export.ts` |

Permissions: `deleteaccount.approve`, `deleteaccount.export`,
`deleteaccount.view`, `deleteaccount.data_export`, `legalholds.manage`.
`/api/user/export-data` is the one exception — it's self-serve, gated only
by the caller's own Bearer token (same pattern as the mobile API surface),
not an admin permission.

`export.ts` is the CSV export of the request *queue* (a compliance log);
`export-request.ts`/`export-download.ts` are the Epic 3.4 GDPR export of one
user's own data — distinct routes, distinct permission
(`deleteaccount.data_export`), because they answer different questions.

## Deletion cascade (Epic 3.4)

`detail.ts`'s `process_now` action and the daily grace-period cron
(`expire_delete_account_grace_periods()`) both call
`public.purge_or_anonymize_user(p_user_id)` — the single source of truth for
what happens to a deleted user's data across every table, defined in
`supabase/migrations/20260908_epic3_4_retention_deletion_cascade.sql`. See
`docs/epic3-4-retention-map.md` for the full per-table disposition and the
reasoning behind it (most "anonymize" tables need no code — they hold only
an opaque FK and are anonymized transitively via `user_profiles`).

A row in `legal_holds` (placed/released through `api/legal-hold.ts`) makes
that RPC a no-op for its `user_id`, and also gates the 7-year financial
retention sweep (`anonymize_expired_financial_records()`, same migration).
It has no admin UI list yet beyond the badge on this feature's own request
table — see the migration file for the schema if you need to query it
directly.

## GDPR export (Epic 3.4)

Three different shapes of the same underlying data, all built from the one
`EXPORT_TABLES` list in `schema/export-tables.ts` so they can't drift apart:

- **Admin zip** — `api/export-request.ts` zips one JSON file per table and
  uploads to the private `user-data-exports` bucket.
  `delete_account_requests.data_export_url` stores the **object path**, not a
  fetchable URL — `api/export-download.ts` mints a fresh 1-hour signed URL on
  demand.
- **Self-serve zip** — `api/self-export.ts` (`POST /api/user/export-data`,
  2026-09-18) is the same table walk scoped to the caller's own `user_id` via
  their Bearer token, rate-limited, streamed straight back as a download —
  no admin in the loop. This is what the public `/delete-account` page's
  "Download my data" button calls; nothing mobile-facing calls it yet, but
  nothing stops a future release from reusing it.
- **Admin PDF** — `api/export-pdf.ts` (`GET
  /api/admin/delete-account-requests/export-pdf?request_id=…`, same day)
  renders the same data as the formatted "Personal Data Access Report" a
  data subject would actually read, grouped by `schema/pdf-report-categories.ts`
  with a plain-language legal basis and the real consent date per category
  where one exists. The render logic lives in
  `api/render-personal-data-report.ts`, split out specifically so it has no
  `server-only`-gated dependency and can run standalone against the
  service-role client (e.g. from a `tsx` script) without a live admin
  session — that file's header explains why "some categories are
  summarized, not row-dumped" is not the same thing as hiding them from a
  DSAR, which GDPR/the Ghana Data Protection Act does not permit.

## Mobile contract

No route here is called by the Expo app, so these are free to change shape.

**Contracted tables written here:** `user_profiles`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `get_delete_account_request_stats`,
`log_admin_activity`, `purge_or_anonymize_user`, `anonymize_expired_financial_records`
(the latter is cron-invoked only, never called from a route).

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client — except `legal_holds`, which
has RLS enabled with zero policies (service-role only, per CLAUDE.md rule 1)
and so is only ever read through `api/legal-hold.ts`'s `GET`, never the
browser client directly. See `lib/db/README.md`.
