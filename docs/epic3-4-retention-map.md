# Epic 3.4 — data retention & deletion map

**Status: implemented (2026-09-08).** The dispositions below were proposals
until a legal/compliance sign-off round happened in-session; the table now
records what was decided, and the "What shipped" section below records what
the decisions turned into. `docs/cleanup-handoff.md`-style: this page is a
map of the system, not a changelog — read `git log` for the commit, not this
file, if you need the "when."

## The one fact that mattered most

"Deleting an account" used to do exactly one thing: an `UPDATE user_profiles`
that blanks the name, nulls a handful of PII columns, sets `status: "banned"`,
and stamps `deleted_at`. That was the **entire** effect, whether triggered by
an admin's "process now" action or by the daily grace-period cron — both code
paths ran an identical, hand-duplicated single-table update, and nothing else
happened: none of the ~80 other tables with a foreign key into `user_profiles`
were touched, no storage object was ever cleaned up, and there was no way to
mark an account "don't touch this, it's under legal hold."

That duplication is gone. Both callers now go through one function,
`public.purge_or_anonymize_user(p_user_id)`
(`supabase/migrations/20260908_epic3_4_retention_deletion_cascade.sql`), which
is also where the legal-hold check lives. `auth.users` is still deliberately
untouched (~100-year GoTrue ban, not a delete) — that turned out to be
load-bearing, not just a quirk to preserve; see "Resolving identity during a
retention window" below.

## Genuinely user-owned content — decided dispositions

These are tables where the FK column is the row's *data subject* — the user
themselves, not a staff member who acted on the row.

| Table(s) | What it holds | Decided disposition | What actually runs |
| --- | --- | --- | --- |
| `medication_enquiries`, `medication_reminders`, `medication_adherence`, `drug_interaction_flags`, `drug_verification_requests` | Health/medication history | Anonymize (keep de-identified rows for aggregate stats; drop identity) | `medication_enquiries`' denormalized PII columns (`prescription_url`, `delivery_address`, `delivery_gps`, `delivery_proof_url`, `insurance_policy_number`, `insurance_provider`, `pickup_confirmation_code`, `tracking_number`) are nulled and the photos queued for storage cleanup. The other four tables hold only an opaque `user_id` — anonymized transitively via `user_profiles`, no code needed. |
| `period_*` tables (daily logs, cycles, TTC profiles, ovulation tests, fertility insights, notes) | Reproductive health data | Anonymize | FK-only — transitively anonymized via `user_profiles`, no code needed. |
| `messages`, `conversation_members`, `message_reads`, `chat_support` | Chat/support content | Anonymize sender identity; retain content for the *other* party's conversation history | FK-only (no denormalized sender name on `messages` itself) — transitively anonymized, no code needed. Content stays, satisfying the counterparty half by construction. |
| `job_applications`, `job_alerts`, `job_saved` | Job-seeker activity | Hard-delete | `DELETE`d in `purge_or_anonymize_user()`. `job_applications.resume_url` is queued for storage cleanup (`job-documents` bucket) before the delete. |
| `hcp_digital_cvs`, `hcp_verifications` | Professional credentials | **Retain indefinitely** — licence-fraud investigations have no fixed statute of limitations | Untouched by any deletion path, by design. |
| `facility_reviews`, `facility_favorites`, `app_reviews` | Reviews/favorites | Anonymize (keep review text/rating for facility integrity; drop identity) | FK-only — transitively anonymized, no code needed. |
| `escrow_transactions` (buyer/seller side), `transaction_records`, `subscription_upgrade_requests`, `user_subscriptions` | Money movement | **Retain 7 years, then anonymize** | Untouched at deletion time. `anonymize_expired_financial_records()` (daily cron) finds `delete_account_requests` rows `processed_at <= now() - 7 years`, skips anyone under an active legal hold, and nulls free-text/jsonb fields likely to carry incidental PII (`metadata`, `dispute_reason`/`dispute_resolution`, `description`, `note`, `decline_reason`, `paystack_reference`). FK columns (`buyer_id`, `user_id`, etc.) are left intact — see "Resolving identity" below for why that's still safe. |
| `fitness_*` participation tables (challenge entries, streaks, health sync logs, onboarding selections) | Fitness activity | Anonymize | FK-only — transitively anonymized, no code needed. |
| `notifications`, `user_push_tokens`, `user_notes` | Delivery/device state | Hard-delete | `DELETE`d in `purge_or_anonymize_user()`. |
| `device_attestation_log`, `device_sign_in_requests`, `security_device_signals` | Security telemetry tied to this user | Retain, drop identity where the investigation doesn't need it | FK-only — transitively anonymized via `user_profiles`, no code needed. The row (device/platform/signal data) survives for fraud investigation, exactly as intended. |
| `analytics_events`, `*_views` (condition/symptom/healthy_living/exercise/challenge) | Engagement analytics | Anonymize | FK-only — transitively anonymized, no code needed. |
| `collector_footprints` (staff GPS history) | Field-collector location trail | Anonymize immediately | FK-only (`collector_id`) — transitively anonymized, no code needed. |
| `facility_scout_submissions`/`facility_scout_referrals`, `data_collectors`, `map_collectors` | Field-collector submissions and reward/payment | **Retain 7 years, then anonymize** (reward/payment implications, same reasoning as financial records) | `facility_scout_referrals.delivery_phone` is nulled by `anonymize_expired_financial_records()` after 7 years. `facility_scout_submissions`/`data_collectors`/`map_collectors` are FK-only — transitively anonymized once `user_profiles` is blanked; no separate sweep needed for them. |

The "transitively anonymized, no code needed" note on most rows isn't a gap —
it's the actual finding from re-reading every column shape in
`lib/db/database.types.ts` before writing the migration: most of these tables
hold nothing but an opaque `user_id`/`sender_id`/`collector_id` FK, and the
admin UI and mobile app both resolve a display name by joining to
`user_profiles`. Once that row is blanked, every join through it already
renders "Deleted User" — the gap this epic closed was the storage objects and
the tables with *their own* denormalized PII, not a missing anonymization
step on every table individually.

## Resolving identity during a retention window

Retaining `escrow_transactions`/`hcp_verifications` etc. "with identity" for
years, while `user_profiles` gets blanked on day one of every deletion,
looks like a contradiction — a compliance officer looking at a 3-year-old
transaction six months from now can't resolve who it was via the normal
join either, once `first_name` reads `"Deleted"`.

The fix didn't need a new PII-vault table. `auth.users` was already never
touched by deletion (a ~100-year GoTrue ban, not a delete — a decision that
predates this epic). That retained email/phone is the identity anchor for
compliance lookups during the financial 7-year window and the indefinite HCP
window: `admin.auth.admin.getUserById(user_id)` against the FK still sitting
on those rows, not `user_profiles`. This is why
`anonymize_expired_financial_records()` never touches the FK columns
themselves — severing them would sever the one path back to `auth.users`
that makes the retention meaningful in the first place.

## Admin-attribution columns — not touched by a user's own deletion

Columns on the same FK-scan that are **not** the row's data subject — a
staff member who reviewed, approved, or created something
(`reviewed_by`/`approved_by`/`verified_by`/`created_by`/`updated_by`/
`resolved_by` across `conditions`, `symptoms`, `facility_profile`,
`job_postings`, `marketing_discounts`, `platform_settings`,
`notification_templates`, etc.). None of these are touched by
`purge_or_anonymize_user()` — the audit trail is supposed to survive the
actor leaving. If an *admin's* account is offboarded, that's a different,
still-undiscussed process.

## Storage buckets

| Bucket | Public | Cleaned up on deletion? |
| --- | --- | --- |
| `bucket4ol` | Yes | Yes — the user's avatar path is queued for cleanup |
| `prescriptions` | No | Yes — `medication_enquiries.prescription_url`/`delivery_proof_url` |
| `job-documents` | No | Yes — `job_applications.resume_url` (queued before the row is hard-deleted) |
| `chat-attachments` | No | No, deliberately — content is retained for the other conversation participant |
| `hcp-verification` | No | No — HCP data is retained indefinitely, and this bucket isn't wired to any upload route regardless |
| `user-data-exports` | No | New (Epic 3.4) — holds generated GDPR export zips, keyed by `delete_account_requests.id` |

Objects are removed via `storage_cleanup_queue` → the `storage-cleanup` Edge
Function, not deleted synchronously inside the SQL function (Postgres has no
Storage-object-delete primitive). That function used to hard-code a single
bucket for every queued row regardless of what `bucket_name` said — fixed
alongside this epic so `prescriptions`/`job-documents` rows actually route to
the right bucket instead of silently failing forever.

## Legal hold

`legal_holds` (same migration) — a table, not a single flag, so overlapping
matters are trackable independently and releasing one doesn't reopen deletion
while another is still active. Placed/released through
`features/delete-account-requests/api/legal-hold.ts`, gated by
`legalholds.manage` (`compliance_officer` only, mirroring
`deleteaccount.approve`'s existing grant set). An active hold makes
`purge_or_anonymize_user()` a no-op (the request stays in `grace_period`
rather than being marked `completed`) and is also checked by
`anonymize_expired_financial_records()`.

## Backup / PITR retention

The Supabase project (`rhbbxttxnvcziyqzptqs`) is currently on the **free
plan**, which has no PITR and only very limited backup retention. This is
documented against the **Pro-tier default** the project will move to: daily
backups retained **7 days**, with a paid PITR add-on available for longer
windows (14/28 days). **Update this paragraph if that add-on is purchased**
— it changes the honest answer to "how long could deleted data persist in a
backup after deletion," which belongs in the privacy policy, not just here.

Deleted/anonymized data can persist in an encrypted backup for up to that
window before the normal backup-rotation cycle purges it. That's the accepted
GDPR posture (Stripe/Auth0/GitHub all publish variants of this): backups
aren't hand-scrubbed, they're bounded and documented, and never restored to
production except for disaster recovery.

## GDPR export

`features/delete-account-requests/api/export-request.ts` walks the same
user-owned table list above (every category, regardless of disposition —
"everything we have" has to include data that will later be anonymized or
hard-deleted too), zips one JSON file per table, and uploads to the private
`user-data-exports` bucket.
`delete_account_requests.data_export_url` now stores the **object path**, not
a fetchable URL (the bucket is private); `export-download.ts` mints a fresh
1-hour signed URL on demand rather than storing a long-lived one.

Admin-triggered only for now: a self-serve in-app "download my data" button
is a new mobile-facing route and needs its own Expo release (CLAUDE.md rule
2). Email doesn't send yet either (no SES credentials — see CLAUDE.md's
"Known sharp edges"), so an admin generates the package and relays the
signed link manually rather than the system emailing it automatically. Both
of those are the reason this shipped admin-only rather than waiting on Epic
4.2.
