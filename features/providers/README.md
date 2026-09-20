# Providers

Provider (facility owner) account creation and credential delivery — P0-06.
This is the first slice of what P0-10 (`PLAN.md`) will grow into the full
`providers` module once `facility_profile` is renamed. For now it owns only
the account/invite path; facility CRUD stays in `features/facilities/`.

## Layout

```
features/providers/
  api/      register-account.ts (POST /api/admin/providers/register),
            resend-invite.ts (POST /api/admin/providers/[id]/resend-invite)
  data/     useRegisterProviderAccount, useResendProviderInvite
  schema/   registerProviderAccountSchema — re-exports
            features/facilities/schema/types.ts's facilityProfileSchema, the
            shape both the Add Facility dialog and this API agree on
```

## What it owns

- **Tables:** `credential_deliveries` (own), writes to `facility_profile` and
  `user_profiles` (owned by `features/facilities` / auth, not this feature).
- **RPCs:** `get_user_id_by_email`, `register_facility_with_profile` (owned
  by the facilities/auth domain; called from here, not defined here).
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

## Mobile

Not consumed by the mobile app directly. The invite link it delivers opens
the **Business app** (`apps/business`, once P0-17 lands) via a custom scheme
(`fourourlifebusiness://auth/confirm`) — that deep-link handler and the
set-password overlay are mobile-repo work, out of scope here until the
Business app exists.
