# Providers

Two things live here, added in two passes:

1. **Provider account creation and credential delivery (P0-06).** The
   register/invite path — still the only thing that writes a new provider
   account into existence.
2. **The Providers admin module (P0-14).** A browse/verify/manage registry
   covering all five provider kinds (`care_facility`, `vendor`,
   `practitioner`, `trainer`, `ambulance_operator`), backed by the
   `providers` table (renamed from `facility_profile` in P0-10). Every
   P0-14 bullet is built: the list, all nine detail tabs, the four admin
   home queues, and the three Settings lookup editors. Provider *creation*
   (P0-06) and facility CRUD/CSV export/Top Rated/Featured (all
   `features/facilities/`, untouched) are the two things still outside this
   module — see "What's still outside this module" below.

## Layout

```
features/providers/
  ui/       ProvidersPage (list), ProviderQueues (admin home queues),
            ProviderDetailPage (nine-tab shell) + ui/tabs/*.tsx (one per tab), columns
  api/      register-account.ts, resend-invite.ts (P0-06)
            list.ts, stats.ts, options.ts, detail.ts, status.ts, queues.ts,
            credentials.ts, capabilities.ts, catalogue.ts, reviews.ts,
            subscription.ts, deliveries.ts, activity.ts (P0-14)
            settings-provider-types.ts, settings-credential-types.ts,
            settings-capabilities.ts (P0-14 Settings editors)
  data/     useRegisterProviderAccount (P0-06); useProviders.ts,
            useProviderTabs.ts, useProviderSettings.ts (P0-14)
  schema/   types.ts — registerProviderAccountSchema (re-exports
            features/facilities/schema/types.ts's facilityProfileSchema) plus
            every P0-14 row/filter/option shape, one section per tab
```

The three Settings editors' UI lives in
`app/(dashboard)/settings/_components/ProvidersTab.tsx` (a new "Providers"
tab in the existing Settings page), not under `features/providers/ui/` —
Settings itself isn't feature-ized yet (all its tabs live in
`app/(dashboard)/settings/_components/`), so this follows that page's own
convention rather than being the one tab that breaks it.

`app/(dashboard)/providers/page.tsx` and `app/(dashboard)/providers/[id]/page.tsx`
re-export from `ui/`; `app/api/providers/*` route files re-export from `api/`
(one file per endpoint; `app/api/providers/credentials/*` and
`app/api/admin/providers/*` predate the P0-14 slice and are untouched).

## What the P0-06 half owns

- **Tables:** `credential_deliveries` (own), writes to `facility_profile`/
  `providers` and `user_profiles`.
- **RPCs:** `get_user_id_by_email`, `register_facility_with_profile`.
- **External services:** SendGrid (`lib/email.ts`), Twilio WhatsApp
  (`lib/twilio.ts`, gated on `TWILIO_PROVIDER_INVITE_TEMPLATE_SID` — inactive
  until the Meta template is approved), AWS SMS (`lib/aws-sms.ts`).
- **Webhook:** `app/api/webhooks/twilio-status/route.ts` updates
  `credential_deliveries` from Twilio status callbacks and triggers the SMS
  fallback — lives under `app/api/webhooks/` (shared webhook namespace), not
  under this feature's own `api/`.
- **Public page:** `app/auth/welcome/page.tsx` is the landing page the
  invite link points at. It is a URL contract (see `AGENTS.md`/rule 4), so it
  stays in `app/`, not here.
- Not consumed by the mobile app directly. The invite link it delivers opens
  the **Business app** (`apps/business`, once P0-17 lands) via a custom
  scheme (`fourourlifebusiness://auth/confirm`) — the deep-link handler and
  set-password overlay are mobile-repo work, out of scope here.

## P0-14 status: every spec'd bullet built, 22 Sept

- **List view**, filtered by kind, type, status, verification, tier and
  region (`ui/ProvidersPage.tsx`, `api/list.ts`, `api/options.ts`,
  `api/stats.ts`).
- **All nine detail tabs**, each with real content (`ui/ProviderDetailPage.tsx`
  + `ui/tabs/*.tsx`, deep-linkable via `?tab=`):
  - **Profile** — contact, address, owner PII (`provider_private`), status
    notes, approve/suspend/reinstate.
  - **Credentials** — list, verify/reject. A plain `UPDATE provider_credentials
    SET status = ...` via the admin client, not a wrapper RPC:
    `trg_provider_credential_status_change` (P0-11) already grants/revokes
    the dependent capabilities and recomputes `verification_status` on any
    `UPDATE OF status`, regardless of caller.
  - **Capabilities** — list, admin override grant/revoke via the P0-11 RPCs
    `grant_provider_capability_override`/`revoke_provider_capability`. These
    self-authorize with `is_app_admin()`, which reads `request.jwt.claims` —
    empty on a bare service-role call, so they must be called through
    `getServerClient()` (the signed-in admin's real session), not
    `getAdminClient()`. Getting this wrong fails silently-ish (a clean "Not
    authorized" 500, not a crash) — see `api/capabilities.ts`'s header
    comment for the full story; it was caught live before shipping.
  - **Catalogue** — list, admin publish/reject. `trg_catalogue_item_publish_guard`
    blocks publishing an item whose required capability the provider doesn't
    hold; verified live in both directions.
  - **Reviews** — scoped read + moderate on `facility_reviews`, sharing the
    existing `reviews.moderate` permission with the global Reviews module.
  - **Subscription** — read-only (`facility_subscriptions`); grants and
    checkout stay in `/subscriptions`.
  - **Payouts** — a static "on hold" panel. Not a stub: there is no payout
    data model to query until D12 unblocks it.
  - **Deliveries** — `credential_deliveries` (P0-06), scoped to the provider.
  - **Activity** — `provider_activity_log` (P0-12), capped at 200 rows.
- **Admin home queues** — `api/queues.ts` (credentials to review, catalogue
  to review, expiring within 30 days, onboarding requests), rendered as an
  expandable panel above the list (`ui/ProviderQueues.tsx`); each item
  deep-links into the right provider + tab.
- **Settings editors** — a new "Providers" tab in Settings
  (`app/(dashboard)/settings/_components/ProvidersTab.tsx`), one sub-tab per
  lookup table (provider types, credential types, capabilities), each a
  table + add/edit dialog.
- **Suspend flow** — a reason is required (client-side in `SuspendDialog`,
  server-side in `api/status.ts`'s zod refinement). Suspending sets
  `status = 'suspended'`; the existing providers RLS (P0-02) already hides
  anything but `status = 'active'` from anon/public reads, so the directory
  and enquiry-matching effect follow for free.

### What's still outside this module

Two things, both deliberately not in P0-14's own bullet list:

1. **Provider creation.** Still P0-06's `registerProviderAccount()`, reached
   through the Facilities "Register Facility" flow — `create_provider`, the
   newer kind-first RPC, has no caller from either module yet.
2. **Facility CRUD/CSV export/Top Rated/Featured** — `features/facilities/`
   and `features/top-rated/`, untouched.

`api/{list,status}.ts` deliberately duplicate what was already
provider-native query logic in `features/facilities/api/{list,status-detail}.ts`
rather than repoint the live `/facilities` route at this module — `/facilities`
still has functionality (1) and (2) above that P0-14 never set out to
rebuild, so pointing its URL at this module today would be a regression for
whoever uses those features. `/providers` is additive; `/facilities` is
untouched.

**The cutover is a separate, later task, not a P0-14 checkbox.** Once (1)
and (2) are ported into `features/providers/`,
`app/(dashboard)/facilities/page.tsx` becomes a re-export of
`features/providers/ui/ProvidersPage` — the CLAUDE.md pattern for keeping an
old URL alive while the code underneath moves — and the sidebar entry moves
from `/facilities` to `/providers`. Do that cutover in one deliberate step,
not incrementally.

### Data access

`api/*` uses `getAdminClient()` (service role, bypasses RLS) after
`requireAdminApiUser(permission)`, per `lib/db/README.md` — **except**
`api/capabilities.ts`'s POST/DELETE, which use `getServerClient()` instead.
Those two call RPCs that self-authorize via `is_app_admin()` reading
`request.jwt.claims`; a bare service-role call carries no user JWT at all, so
`getAdminClient()` made them fail every time with "Not authorized". Any
future RPC call in this feature that internally checks `auth.uid()` /
`is_app_admin()` (rather than trusting the caller because it's already
service-role) needs the same treatment — check the RPC body before assuming
`getAdminClient()` is safe just because every *other* route in this module
uses it.

The permission required by `api/status.ts` depends on the **target**
status, not the route: suspending needs `providers.suspend`, an
activate/reject verification decision needs `providers.verify`, anything
else needs `providers.edit`. See the comment at the top of that file.

The three Settings editor routes (`api/settings-*.ts`) are all gated on
`provider_types.manage` for both reads and writes — a stricter gate than
`providers.view`, since this is specifically the lookup-table editing
surface, not the general read-only options endpoint (`api/options.ts`,
which stays on `providers.view` and is what the list-page filters use).

### Things that will surprise you

- **`provider_private` carries the owner PII** (`owner_email`, `owner_phone`,
  `owner_first_name`/`last_name`, `admin_notes`) — it's a separate table from
  `providers` since P0-10, joined in `api/list.ts` and `api/detail.ts` via a
  PostgREST embed. Querying `providers` alone will not have these columns;
  they were never there.
- **`tier` in the list filter means `subscription_tier`**, and `tier=none`
  is a real filter value (maps to `.is("subscription_tier", null)`), not "no
  filter" — that's what the empty string / `all` sentinel is for.
- **The suspend-requires-a-reason rule is stricter than the general status
  endpoint it was adapted from.** `features/facilities/api/status-detail.ts`
  (still live, backing `/facilities`) accepts an optional reason for every
  status including `suspended`. `features/providers/api/status.ts` does not —
  PLAN.md's P0-14 bullet says explicitly "a reason is required," so the zod
  schema here refines on it. Don't copy the looser facilities schema back
  over this one.
- None of the P0-14 routes are consumed by the mobile app either — mobile
  reaches providers through `search_providers` and other RPCs, never
  `/api/providers/*`. Free to change shape without a mobile release.
