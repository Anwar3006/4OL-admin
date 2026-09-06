# Medication Enquiry

Medication enquiries, pharmacy responses, escrow, delivery and disputes.

Migrated under E3.2. `features/anatomy` is the exemplar — read that README
for the reasoning behind this layout.

## Layout

```
features/medenquiry/
  ui/       9 files — components
  api/      9 files — route handlers, one module per endpoint
  data/     1 files — hooks and queries
  schema/   (empty)
```

## Routes

All URLs unchanged; `app/` holds a re-export per route and no logic.

| URL | Verbs | Handler |
| --- | --- | --- |
| `/api/medenquiry` | GET | `api/list.ts` |
| `/api/medenquiry/[id]` | GET, PATCH | `api/detail.ts` |
| `/api/medenquiry/[id]/broadcast` | POST | `api/broadcast.ts` |
| `/api/medenquiry/[id]/escrow` | PATCH | `api/escrow.ts` |
| `/api/medenquiry/attachment` **(mobile contract)** | GET | `api/attachment.ts` |
| `/api/medenquiry/disputes` | GET | `api/disputes.ts` |
| `/api/medenquiry/disputes/[id]` | PATCH | `api/disputes-detail.ts` |
| `/api/medenquiry/overview` | GET | `api/overview.ts` |
| `/api/medenquiry/pharmacies` | GET | `api/pharmacies.ts` |

Permissions: `medenquiry.manage`, `medenquiry.view`, `transactions.manage`.

## Mobile contract

**1 route(s) here are frozen for mobile** — see the table above and
`tests/contract/mobile-contract.ts`. Never drop a field, rename the route or
reorder a parameter without shipping a mobile release first.

**Contracted tables written here:** `facility_profile`. The Expo app reads them directly
through PostgREST, so changes must be additive.

RPCs called (all admin-only and uncontracted): `get_med_enquiry_overview`.

## Data access

`api/*` uses `getAdminClient()` after `requireAdminApiUser(permission)`; the
handlers were converted off the deprecated `@/lib/supabase-admin` shim during
the migration. `data/*` uses the browser client. See `lib/db/README.md`.

## Things that will surprise you

- **`/api/medenquiry/attachment` is mobile contract** (GET), called by the Expo
  app's `app/(app)/(auth)/Medication/index.tsx`. It delegates to no RPC.
- **`/medication-enquiry*` still redirects here** from `next.config.ts` (E2.1).
