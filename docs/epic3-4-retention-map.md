# Epic 3.4 — data retention & deletion map

**Status: documentation only.** Nothing on this page has been implemented,
and none of the "proposed" categories below are decisions — they are a
starting point for a legal/compliance sign-off, produced because that
sign-off has to happen before any code changes here, not instead of it.

## The one fact that matters most

"Deleting an account" today does exactly one thing: an `UPDATE user_profiles`
that blanks the name, nulls a handful of PII columns, sets `status: "banned"`,
and stamps `deleted_at`. That is the **entire** effect, whether triggered by
an admin's "process now" action
(`features/delete-account-requests/api/detail.ts`) or by the daily cron that
expires grace periods (`expire_delete_account_grace_periods()`,
`supabase/migrations/20260821_deletion_policy_extension.sql`). Both code
paths run the identical single-table update.

Nothing else happens:
- `auth.users` is never touched (a ~100-year GoTrue ban is applied instead of
  a delete — an explicit, separate decision per the code's own comments).
- None of the ~80 other tables with a foreign key into `user_profiles` are
  touched, deleted, or anonymized.
- No storage object (prescriptions, CVs, chat attachments, HCP verification
  documents) is ever cleaned up as a result of deletion.
- The existing `storage-cleanup` cron is unrelated — it drains
  `storage_cleanup_queue` (orphaned/expired uploads), and nothing enqueues a
  deleted user's files into it.

So every table below has been sitting there, unaffected by every deletion
that has ever completed, since the feature shipped.

## Genuinely user-owned content

These are tables where the FK column is the row's *data subject* — the
user themselves, not a staff member who acted on the row. Pulled from a live
`information_schema` query against every FK targeting `user_profiles`, then
filtered to subject-style columns (`user_id`, `patient_id`, `applicant_id`,
`sender_id`, `owner_id`, etc. — not `reviewed_by`/`approved_by`/`created_by`
by an admin, see the next section).

Each row below has three columns: what it is, what happens to it **today**
(nothing), and a **proposed** disposition — genuinely proposed, not decided.

| Table(s) | What it holds | Proposed disposition | Why |
| --- | --- | --- | --- |
| `medication_enquiries`, `medication_reminders`, `medication_adherence`, `drug_interaction_flags`, `drug_verification_requests` | Health/medication history | Anonymize (keep de-identified rows for aggregate stats; drop identity) | Clinical/product value in aggregate; PHI shouldn't outlive the account |
| `period_*` tables (daily logs, cycles, TTC profiles, ovulation tests, fertility insights, notes) | Reproductive health data | Anonymize | Same reasoning, and this is the most sensitive category on the platform |
| `messages`, `conversation_members`, `message_reads`, `chat_support` | Chat/support content | Anonymize sender identity; consider retaining message content for the *other* party's conversation history (a DM's other participant still owns their side of it) | Deleting a shared conversation wholesale removes the counterparty's data, which isn't this user's to delete |
| `job_applications`, `job_alerts`, `job_saved` | Job-seeker activity | Hard-delete | Pure user convenience data, no compliance/audit reason to retain |
| `hcp_digital_cvs`, `hcp_verifications` | Professional credentials | **Needs a decision, not a default** | A verified HCP credential may need retention for licence-fraud investigation even after the account closes — this is the clearest case that needs a real legal answer, not an engineering default |
| `facility_reviews`, `facility_favorites`, `app_reviews` | Reviews/favorites | Anonymize (keep review text/rating for facility integrity; drop identity) | A published review shouldn't vanish because the author deleted their account, but the author's identity should |
| `escrow_transactions` (buyer/seller side), `transaction_records`, `subscription_upgrade_requests`, `user_subscriptions` | Money movement | **Retain, do not delete or anonymize, for a defined period** | Financial/tax record-keeping obligations almost always outlive account deletion — the retention *period* is a legal question, not one to default here |
| `fitness_*` participation tables (challenge entries, streaks, health sync logs, onboarding selections) | Fitness activity | Anonymize | Aggregate/leaderboard value; no compliance reason to keep identity |
| `notifications`, `user_push_tokens`, `user_notes` | Delivery/device state | Hard-delete | Pure operational state, no retention value once the account is gone |
| `device_attestation_log`, `device_sign_in_requests`, `security_device_signals` | Security telemetry tied to this user | Retain (security investigations may need this after the fact), but drop direct identity where the investigation doesn't need it | Fraud/abuse investigation can span account lifetimes |
| `analytics_events`, `*_views` (condition/symptom/healthy_living/exercise/challenge) | Engagement analytics | Anonymize | Aggregate product metrics; no reason to keep identity |
| `facility_scout_submissions`/`referrals`, `data_collectors`, `map_collectors`, `collector_footprints`/`submissions` | Field-collector activity | **Needs a decision** — footprints are staff GPS history, submissions may carry reward/payment implications | Overlaps with the collector-footprint access-control question already flagged in TASKS.md 5.3 |

## Admin-attribution columns — not touched by a user's own deletion

These are the columns on the *same* FK-scan that are **not** the row's data
subject — a staff member who reviewed, approved, or created something. The
list is long (`admin_activity_logs.admin_id`, every `reviewed_by`/
`approved_by`/`verified_by`/`created_by`/`updated_by`/`resolved_by` across
`conditions`, `symptoms`, `facility_profile`, `job_postings`,
`marketing_discounts`, `platform_settings`, `notification_templates`, etc. —
roughly 45 of the ~80 FK relationships pulled).

**Recommendation: none of these should be touched when a *user* account is
deleted.** They record who-did-what for audit purposes, and the whole point
of an audit trail is that it survives the actor leaving. If an *admin's*
account is offboarded, that's a different, undiscussed process — deleting
or anonymizing `admins.view`-adjacent attribution would gut the audit log
that Epic 3.2/3.3 depend on. Flagging this distinction here so it isn't
missed when 3.4 eventually gets built: "delete the user" and "an admin
stopped working here" are two different flows with different retention
answers, and only the first exists today (and even that only partially).

## Storage buckets needing a deletion-triggered cleanup path

None of these are wired to account deletion today:

| Bucket | Public | Contents |
| --- | --- | --- |
| `bucket4ol` | Yes | Legacy shared bucket (pre-Epic-2.5); some objects still referenced by old public URLs |
| `prescriptions` | No | Medication enquiry prescription photos |
| `job-documents` | No | CVs and licence/certificate uploads |
| `chat-attachments` | No | Chat media |
| `hcp-verification` | No | HCP verification documents |

Whatever the table-level disposition ends up being, any category marked
hard-delete or anonymize needs its associated storage objects enumerated and
either deleted or re-owned (e.g. a fitness photo attached to an anonymized
row probably needs to go with it). Nothing enumerates "this user's files
across all five buckets" today — that lookup doesn't exist and would need
to be built regardless of which retention decision is made.

## The three pieces that are simply absent

- **Legal hold.** Zero occurrences anywhere in the codebase except this
  epic's own description in TASKS.md. There's no way today to mark an
  account "don't actually delete/anonymize this, it's under investigation
  or litigation" even if 3.4's disposition logic were built.
- **Backup/PITR retention documentation.** This is a Supabase-dashboard
  setting with no in-repo record of what it's currently set to. Worth
  pulling and documenting even before any deletion-logic work starts, since
  "how long does a backup keep a copy of data we just anonymized" is part of
  the honest answer to "is this user's data actually gone."
- **Real per-user data export.** `delete_account_requests.data_export_url`
  exists as a column but nothing ever writes to it — `remind_download` only
  timestamps that a reminder was sent, it doesn't generate anything. There is
  no GDPR-style "here is everything we hold about you" package anywhere in
  either app, admin-side CSV exports (which are exports of the *request
  queue*, a compliance log, not of one user's own data) included.

## What this unblocks

Once the table above has real (not proposed) dispositions attached, the
actual build is: a single `purge_or_anonymize_user(p_user_id)` -style
function that walks the "genuinely user-owned" list applying whatever was
decided, a storage-side enumeration/cleanup step, and a legal-hold check
that short-circuits the whole thing when set. None of that is started.
